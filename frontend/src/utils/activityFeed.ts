import { Field } from '../services/fieldsApi';
import { Booking } from '../services/bookingsApi';
import { Escalation } from '../services/escalationsApi';
import { AuditEntry, stringDetail, nullableStringDetail } from '../services/auditTrailApi';

export type ActivityCategory = 'booking_created' | 'booking_cancelled' | 'scheduling_issue' | 'request_decided' | 'upcoming_booking';

export interface ActivityItem {
  id: string;
  category: ActivityCategory;
  icon: string;
  // Dashboard's own combined display text (e.g. "New booking — Alice booked
  // Riverside Pitch") - kept exactly as it was before this was extracted,
  // so DashboardPage's rendering never had to change.
  label: string;
  // When this event was recorded - used for sorting, and by Dashboard for
  // its own literal timestamp display.
  timestamp: string;
  // Notification-style fields: a short title ("New booking request") and,
  // where a specific field/time is what the notification is actually
  // about, that time - which for a booking event is the booking's own
  // start time, not when the admin action happened. `subtitleText` covers
  // categories (like an escalation decision) that aren't about a field/time
  // at all.
  title: string;
  fieldName: string | null;
  relevantTime: string | null;
  subtitleText: string | null;
}

export function fieldLabel(fields: Field[], fieldId: string): string {
  const field = fields.find((f) => f.id === fieldId);
  return field ? field.name : fieldId;
}

// Merges the 3 activity-relevant audit entity types into one feed, most
// recent first. Reuses the exact audit-trail accessor STORY-015 already
// built - no second, parallel activity log. Shared by DashboardPage's
// Recent Activity section and the notification bell, so there is exactly
// one place this categorization logic lives.
export function buildActivityFeed(
  bookingEntries: AuditEntry[],
  issueEntries: AuditEntry[],
  customerIssueEntries: AuditEntry[],
  escalations: Escalation[],
  fields: Field[],
  limit = 8,
): ActivityItem[] {
  const escalationsById = new Map(escalations.map((e) => [e.id, e]));
  const items: ActivityItem[] = [];

  for (const entry of bookingEntries) {
    const field = fieldLabel(fields, stringDetail(entry.details, 'fieldId'));
    const startTime = stringDetail(entry.details, 'startTime') || null;
    if (entry.action === 'created') {
      items.push({
        id: entry.id,
        category: 'booking_created',
        icon: '📅',
        label: `New booking — ${entry.actor} booked ${field}`,
        timestamp: entry.timestamp,
        title: 'New booking request',
        fieldName: field,
        relevantTime: startTime,
        subtitleText: null,
      });
    } else if (entry.action === 'cancelled') {
      items.push({
        id: entry.id,
        category: 'booking_cancelled',
        icon: '✖️',
        label: `Booking canceled — ${entry.actor}'s booking for ${field}`,
        timestamp: entry.timestamp,
        title: 'Booking canceled',
        fieldName: field,
        relevantTime: startTime,
        subtitleText: null,
      });
    }
  }

  for (const entry of issueEntries) {
    if (entry.action === 'detected') {
      const field = fieldLabel(fields, stringDetail(entry.details, 'fieldId'));
      const requestedStartTime = stringDetail(entry.details, 'requestedStartTime') || null;
      items.push({
        id: entry.id,
        category: 'scheduling_issue',
        icon: '⚠️',
        label: `Scheduling issue detected — ${field}`,
        timestamp: entry.timestamp,
        title: 'Scheduling conflict detected',
        fieldName: field,
        relevantTime: requestedStartTime,
        subtitleText: null,
      });
    }
  }

  // Only the human-decision entries carry a `decision` field - the AI's
  // own instant-resolution entries for the same entityType don't, so they
  // never show up here as a false "approved/denied" event. "Booking
  // approved" was the user's own example phrasing, but nothing in this
  // system's domain model approves a booking itself - refund/complaint
  // *requests* are what get approved or denied, so that's what's named
  // here, honestly, rather than mislabeling it.
  for (const entry of customerIssueEntries) {
    const decision = nullableStringDetail(entry.details, 'decision');
    if (!decision) continue;
    const escalation = escalationsById.get(entry.entityId);
    const who = escalation ? escalation.customerName : 'a customer';
    items.push({
      id: entry.id,
      category: 'request_decided',
      icon: decision === 'approved' ? '✅' : '🚫',
      label: `Request ${decision} — ${who}'s ${escalation?.type ?? 'request'}`,
      timestamp: entry.timestamp,
      title: decision === 'approved' ? 'Request approved' : 'Request denied',
      fieldName: null,
      relevantTime: null,
      subtitleText: `${who}'s ${escalation?.type ?? 'request'}`,
    });
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

// A booking that's about to start is a real, useful reminder this app's
// data already supports - no audit-trail entry exists for "this is coming
// up soon" (it isn't an event that happened), so it's computed fresh from
// live booking data each time instead.
export function buildUpcomingBookingNotifications(
  bookings: Booking[],
  fields: Field[],
  windowHours = 3,
  limit = 5,
): ActivityItem[] {
  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;

  return bookings
    .filter((b) => {
      if (b.status !== 'confirmed') return false;
      const startMs = new Date(b.startTime).getTime();
      return startMs > now && startMs - now <= windowMs;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, limit)
    .map((b) => ({
      id: `upcoming-${b.id}`,
      category: 'upcoming_booking' as const,
      icon: '⏰',
      label: `Upcoming booking — ${fieldLabel(fields, b.fieldId)} for ${b.customerName}`,
      timestamp: b.startTime,
      title: 'Upcoming booking',
      fieldName: fieldLabel(fields, b.fieldId),
      relevantTime: b.startTime,
      subtitleText: null,
    }));
}

// Where clicking a notification should take the user - this app has no
// deep link to one specific record, only tabs, so this maps each category
// to the tab that actually shows the relevant information.
export function notificationNavigationTarget(category: ActivityCategory): 'bookings' | 'scheduling-issues' | 'interactions' {
  switch (category) {
    case 'scheduling_issue':
      return 'scheduling-issues';
    case 'request_decided':
      return 'interactions';
    case 'booking_created':
    case 'booking_cancelled':
    case 'upcoming_booking':
    default:
      return 'bookings';
  }
}
