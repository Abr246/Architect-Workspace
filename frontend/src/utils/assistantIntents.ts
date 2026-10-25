import { Booking } from '../services/bookingsApi';
import { Field } from '../services/fieldsApi';
import { SchedulingIssue } from '../services/schedulingIssuesApi';
import { fieldLabel } from './activityFeed';
import { formatHourLabel } from './timeSlots';

// GoalKick AI's real data-driven intents: each covers one of the suggested
// questions, grounded entirely in fields/bookings/scheduling-issues the app
// already fetches elsewhere. Anything that doesn't match one of these falls
// through to the existing backend assistant (pricing/availability/trends,
// STORY-003/008) rather than being guessed at here.
export type AssistantIntent =
  | 'upcoming-today'
  | 'scheduling-conflicts'
  | 'most-booked-field'
  | 'busiest-times'
  | 'bookings-today'
  | 'fields-available-today'
  | 'customers';

// Order matters: checked top to bottom, first match wins. "upcoming" is
// checked before the generic "today" + "booking" pair so "Show me today's
// upcoming bookings" doesn't get claimed by the plainer bookings-today intent.
const INTENT_PATTERNS: { intent: AssistantIntent; pattern: RegExp }[] = [
  { intent: 'upcoming-today', pattern: /upcoming|next booking/i },
  { intent: 'scheduling-conflicts', pattern: /conflict|scheduling issue/i },
  { intent: 'most-booked-field', pattern: /most booked|booked the most/i },
  { intent: 'busiest-times', pattern: /busiest|peak (time|hour)/i },
  { intent: 'bookings-today', pattern: /how many bookings|bookings?.*today/i },
  { intent: 'fields-available-today', pattern: /(field.*availab|availab.*field)/i },
  { intent: 'customers', pattern: /customer/i },
];

export function matchAssistantIntent(question: string): AssistantIntent | null {
  const trimmed = question.trim();
  if (!trimmed) return null;
  const match = INTENT_PATTERNS.find(({ pattern }) => pattern.test(trimmed));
  return match ? match.intent : null;
}

function isToday(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function confirmed(bookings: Booking[]): Booking[] {
  return bookings.filter((b) => b.status === 'confirmed');
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function fieldsAvailableTodayAnswer(fields: Field[], bookings: Booking[], now: Date = new Date()): string {
  if (fields.length === 0) {
    return "I don't have any fields on record right now.";
  }

  const nowMs = now.getTime();
  const isCurrentlyBooked = (fieldId: string) =>
    confirmed(bookings).some(
      (b) => b.fieldId === fieldId && new Date(b.startTime).getTime() <= nowMs && nowMs < new Date(b.endTime).getTime(),
    );

  const available = fields.filter((f) => !isCurrentlyBooked(f.id));

  if (available.length === 0) {
    return 'No fields are available right now — every field has an active booking at this moment.';
  }

  return `Available right now: ${available.map((f) => f.name).join(', ')}.`;
}

export function bookingsTodayAnswer(bookings: Booking[], now: Date = new Date()): string {
  const todays = confirmed(bookings).filter((b) => isToday(b.startTime, now));

  if (todays.length === 0) {
    return 'There are no bookings scheduled for today.';
  }

  return `There ${todays.length === 1 ? 'is' : 'are'} ${todays.length} booking${todays.length === 1 ? '' : 's'} scheduled today.`;
}

export function schedulingConflictsAnswer(openIssues: SchedulingIssue[], fields: Field[]): string {
  if (openIssues.length === 0) {
    return 'No scheduling conflicts right now — everything looks clear.';
  }

  const fieldNames = Array.from(new Set(openIssues.map((issue) => fieldLabel(fields, issue.fieldId))));

  return `There ${openIssues.length === 1 ? 'is' : 'are'} ${openIssues.length} scheduling conflict${
    openIssues.length === 1 ? '' : 's'
  } that need${openIssues.length === 1 ? 's' : ''} attention: ${fieldNames.join(', ')}.`;
}

export function mostBookedFieldAnswer(fields: Field[], bookings: Booking[]): string {
  const counts = new Map<string, number>();
  for (const b of confirmed(bookings)) {
    counts.set(b.fieldId, (counts.get(b.fieldId) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return "I don't have enough booking history yet to tell which field is booked the most.";
  }

  const max = Math.max(...Array.from(counts.values()));
  const topFieldIds = Array.from(counts.entries())
    .filter(([, count]) => count === max)
    .map(([fieldId]) => fieldLabel(fields, fieldId));

  const subject = topFieldIds.length > 1 ? `${topFieldIds.join(' and ')} are tied` : `${topFieldIds[0]} is`;
  return `${subject} booked the most, with ${max} booking${max === 1 ? '' : 's'}.`;
}

export function busiestTimesAnswer(bookings: Booking[]): string {
  const bookingsConfirmed = confirmed(bookings);
  if (bookingsConfirmed.length === 0) {
    return "I don't have enough booking history yet to know the busiest times.";
  }

  const counts = new Map<number, number>();
  for (const b of bookingsConfirmed) {
    const hour = new Date(b.startTime).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }

  const max = Math.max(...Array.from(counts.values()));
  const busiestHours = Array.from(counts.entries())
    .filter(([, count]) => count === max)
    .map(([hour]) => hour)
    .sort((a, b) => a - b);

  const labels = busiestHours.map(formatHourLabel).join(', ');
  const verb = busiestHours.length > 1 ? 'are' : 'is';
  return `The busiest booking time${busiestHours.length > 1 ? 's' : ''} ${verb} ${labels}, with ${max} booking${max === 1 ? '' : 's'} each.`;
}

export function upcomingTodayAnswer(bookings: Booking[], fields: Field[], now: Date = new Date()): string {
  const upcoming = confirmed(bookings)
    .filter((b) => isToday(b.startTime, now) && new Date(b.startTime).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (upcoming.length === 0) {
    return 'There are no more bookings coming up today.';
  }

  const lines = upcoming
    .slice(0, 5)
    .map((b) => `${formatTime(b.startTime)} — ${fieldLabel(fields, b.fieldId)} (${b.customerName})`);

  return `Today's upcoming bookings: ${lines.join('; ')}.`;
}

export function customersAnswer(bookings: Booking[]): string {
  const bookingsConfirmed = confirmed(bookings);
  if (bookingsConfirmed.length === 0) {
    return "I don't have any customer booking history yet.";
  }

  const counts = new Map<string, number>();
  for (const b of bookingsConfirmed) {
    counts.set(b.customerName, (counts.get(b.customerName) ?? 0) + 1);
  }

  const distinctCount = counts.size;
  const max = Math.max(...Array.from(counts.values()));

  if (max === 1) {
    return `${distinctCount} different customer${distinctCount === 1 ? ' has' : 's have'} made a booking so far.`;
  }

  const topCustomers = Array.from(counts.entries())
    .filter(([, count]) => count === max)
    .map(([name]) => name);

  return `${distinctCount} different customers have made bookings. ${topCustomers.join(' and ')} ${
    topCustomers.length > 1 ? 'are tied for' : 'has'
  } the most, with ${max} bookings.`;
}

export function buildAssistantIntentAnswer(
  intent: AssistantIntent,
  data: { fields: Field[]; bookings: Booking[]; openIssues: SchedulingIssue[] },
  now: Date = new Date(),
): string {
  switch (intent) {
    case 'fields-available-today':
      return fieldsAvailableTodayAnswer(data.fields, data.bookings, now);
    case 'bookings-today':
      return bookingsTodayAnswer(data.bookings, now);
    case 'scheduling-conflicts':
      return schedulingConflictsAnswer(data.openIssues, data.fields);
    case 'most-booked-field':
      return mostBookedFieldAnswer(data.fields, data.bookings);
    case 'busiest-times':
      return busiestTimesAnswer(data.bookings);
    case 'upcoming-today':
      return upcomingTodayAnswer(data.bookings, data.fields, now);
    case 'customers':
      return customersAnswer(data.bookings);
    default:
      return "I'm not able to answer that yet.";
  }
}
