import { recordAuditEntry } from './auditTrailService';
import { reportSchedulingConflict } from './schedulingIssuesService';

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  fieldId: string;
  customerName: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  status: BookingStatus;
}

export interface CreateBookingInput {
  fieldId: string;
  customerName: string;
  startTime: string;
  endTime: string;
}

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingConflictError';
  }
}

export class BookingNotFoundError extends Error {
  constructor(id: string) {
    super(`No booking found with id ${id}.`);
    this.name = 'BookingNotFoundError';
  }
}

// Walking skeleton: in-memory store, same pattern as fieldsService, until
// REQ-016/REQ-017 (database connections) land in a later story.
let bookings: Booking[] = [];
let nextId = 1;

// STORY-010: a cheap version counter, bumped on every real mutation, so a
// cache elsewhere (analyticsService) can tell "nothing changed, reuse what
// you have" from "something changed, recompute" without bookingsService
// needing to know analyticsService exists — avoids a circular import.
let bookingsVersion = 0;
export function getBookingsVersion(): number {
  return bookingsVersion;
}

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingBooking: Booking | null;
}

// STORY-005: conflict detection as its own explicit, reusable capability
// (STORY-002 only ever had this logic inline inside createBooking). Every
// call is logged — both outcomes, not just the failure case — which is
// this story's own "Trust" criterion. A cancelled booking no longer holds
// its slot, so only an active ("confirmed") booking counts as a conflict —
// this is the "False positive conflict" failure path made impossible by
// construction, not just handled.
export function checkForConflict(fieldId: string, startTime: string, endTime: string): ConflictCheckResult {
  const conflictingBooking =
    bookings.find(
      (b) => b.status === 'confirmed' && b.fieldId === fieldId && timesOverlap(b.startTime, b.endTime, startTime, endTime),
    ) ?? null;

  const result: ConflictCheckResult = { hasConflict: conflictingBooking !== null, conflictingBooking };

  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'backend',
        event: 'conflict_check',
        outcome: 'success',
        context: {
          fieldId,
          startTime,
          endTime,
          hasConflict: result.hasConflict,
          conflictingBookingId: conflictingBooking?.id ?? null,
        },
      }),
    );
  } catch (err) {
    // "Logging failure" — a broken logger must never take the conflict
    // check (or the booking flow depending on it) down with it. Note the
    // failure and keep going; the check result itself is still correct.
    // eslint-disable-next-line no-console
    console.error('[bookings] ConflictCheckLoggingError:', err instanceof Error ? err.message : err);
  }

  return result;
}

export function createBooking(input: CreateBookingInput): { booking: Booking; created: boolean } {
  const { hasConflict, conflictingBooking: overlapping } = checkForConflict(
    input.fieldId,
    input.startTime,
    input.endTime,
  );

  if (hasConflict && overlapping) {
    const isSameRequest =
      overlapping.customerName === input.customerName &&
      overlapping.startTime === input.startTime &&
      overlapping.endTime === input.endTime;

    if (isSameRequest) {
      // Idempotent retry of an already-successful booking (e.g. a client
      // retry after a dropped response) — return the existing booking
      // rather than creating a duplicate.
      return { booking: overlapping, created: false };
    }

    // STORY-012: a genuine conflict between two different customers is a
    // scheduling issue the scheduler needs to know about, not just a
    // rejection the requesting customer sees. Isolated in its own
    // try/catch — a failure anywhere in issue-reporting/notification must
    // never prevent the correct customer-facing rejection below.
    try {
      reportSchedulingConflict(input.fieldId, {
        requestedStartTime: input.startTime,
        requestedEndTime: input.endTime,
        requestedBy: input.customerName,
        conflictingBookingId: overlapping.id,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[bookings] SchedulingIssueReportError:', err instanceof Error ? err.message : err);
    }

    throw new BookingConflictError(`Field ${input.fieldId} is already booked for an overlapping time.`);
  }

  const booking: Booking = {
    id: `booking-${nextId++}`,
    ...input,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
  };
  bookings.push(booking);
  bookingsVersion += 1;

  // The generic requestLogger (STORY-001) logs every HTTP request with a
  // timestamp, but has no idea what a "booking" is or who the customer
  // was — it only sees method/path/status. This story's criterion needs
  // customer details too, so log the domain event itself, here at the
  // point a booking is actually recorded. Deliberately only on real
  // creation, not on an idempotent retry — a retry isn't a new event.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      timestamp: booking.createdAt,
      level: 'info',
      service: 'backend',
      event: 'booking_created',
      outcome: 'success',
      context: {
        bookingId: booking.id,
        fieldId: booking.fieldId,
        customerName: booking.customerName,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },
    }),
  );

  // STORY-011: every booking action goes into the audit trail, not just a
  // console log line — this is what makes it queryable/verifiable later,
  // rather than something you'd have to grep stdout for.
  recordAuditEntry({
    entityType: 'booking',
    entityId: booking.id,
    action: 'created',
    actor: booking.customerName,
    details: { fieldId: booking.fieldId, startTime: booking.startTime, endTime: booking.endTime },
  });

  return { booking, created: true };
}

export function cancelBooking(id: string, customerName: string): { booking: Booking; cancelled: boolean } {
  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    throw new BookingNotFoundError(id);
  }

  if (booking.status === 'cancelled') {
    // Idempotent retry: cancelling something already cancelled is not an
    // error — it's the same end state the caller was asking for.
    return { booking, cancelled: false };
  }

  booking.status = 'cancelled';
  bookingsVersion += 1;

  recordAuditEntry({
    entityType: 'booking',
    entityId: booking.id,
    action: 'cancelled',
    actor: customerName,
    details: { fieldId: booking.fieldId, startTime: booking.startTime, endTime: booking.endTime },
  });

  return { booking, cancelled: true };
}

// STORY-007: a read accessor for analytics to build reports from, same
// pattern as listEscalations/listSchedulingIssues.
export function listBookings(status?: BookingStatus): Booking[] {
  if (!status) return [...bookings];
  return bookings.filter((b) => b.status === status);
}

// Test-only: the in-memory store persists across test cases within a
// module, so tests need a way to reset it between runs.
export function resetBookings(): void {
  bookings = [];
  nextId = 1;
  bookingsVersion = 0;
}
