import { recordAuditEntry } from './auditTrailService';

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

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

export function createBooking(input: CreateBookingInput): { booking: Booking; created: boolean } {
  // A cancelled booking no longer holds the slot, so only an active
  // ("confirmed") booking counts as an overlap.
  const overlapping = bookings.find(
    (b) =>
      b.status === 'confirmed' &&
      b.fieldId === input.fieldId &&
      timesOverlap(b.startTime, b.endTime, input.startTime, input.endTime),
  );

  if (overlapping) {
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

    throw new BookingConflictError(`Field ${input.fieldId} is already booked for an overlapping time.`);
  }

  const booking: Booking = {
    id: `booking-${nextId++}`,
    ...input,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
  };
  bookings.push(booking);

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

  recordAuditEntry({
    entityType: 'booking',
    entityId: booking.id,
    action: 'cancelled',
    actor: customerName,
    details: { fieldId: booking.fieldId, startTime: booking.startTime, endTime: booking.endTime },
  });

  return { booking, cancelled: true };
}

// Test-only: the in-memory store persists across test cases within a
// module, so tests need a way to reset it between runs.
export function resetBookings(): void {
  bookings = [];
  nextId = 1;
}
