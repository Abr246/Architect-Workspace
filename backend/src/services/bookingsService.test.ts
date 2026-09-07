import { createBooking, cancelBooking, resetBookings, BookingConflictError, BookingNotFoundError } from './bookingsService';
import { listAuditEntries, resetAuditTrail } from './auditTrailService';

const base = {
  fieldId: 'field-1',
  customerName: 'Alice',
  startTime: '2026-09-05T10:00:00.000Z',
  endTime: '2026-09-05T11:00:00.000Z',
};

describe('createBooking', () => {
  beforeEach(() => {
    resetBookings();
    resetAuditTrail();
  });

  it('creates a new booking', () => {
    const { booking, created } = createBooking(base);

    expect(created).toBe(true);
    expect(booking.fieldId).toBe('field-1');
    expect(booking.customerName).toBe('Alice');
    expect(booking.id).toEqual(expect.any(String));
    expect(booking.createdAt).toEqual(expect.any(String));
  });

  it('returns the same booking on an identical retry, without creating a duplicate', () => {
    const first = createBooking(base);
    const second = createBooking(base);

    expect(second.created).toBe(false);
    expect(second.booking.id).toBe(first.booking.id);
  });

  it('throws a conflict error when a different customer overlaps an existing booking', () => {
    createBooking(base);

    expect(() =>
      createBooking({
        ...base,
        customerName: 'Bob',
        startTime: '2026-09-05T10:30:00.000Z',
        endTime: '2026-09-05T11:30:00.000Z',
      }),
    ).toThrow(BookingConflictError);
  });

  it('allows a non-overlapping booking on the same field', () => {
    createBooking(base);

    const { created } = createBooking({
      ...base,
      customerName: 'Bob',
      startTime: '2026-09-05T11:00:00.000Z',
      endTime: '2026-09-05T12:00:00.000Z',
    });

    expect(created).toBe(true);
  });
});

describe('createBooking — audit logging', () => {
  beforeEach(() => {
    resetBookings();
    resetAuditTrail();
  });

  it('logs customer details and a timestamp when a booking is actually created', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    createBooking(base);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(logged.event).toBe('booking_created');
    expect(logged.context.customerName).toBe('Alice');
    expect(logged.context.fieldId).toBe('field-1');
    expect(logged.timestamp).toEqual(expect.any(String));
    expect(new Date(logged.timestamp).toString()).not.toBe('Invalid Date');

    logSpy.mockRestore();
  });

  it('does not log again on an idempotent retry', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    createBooking(base);
    createBooking(base); // identical retry — same request as above

    expect(logSpy).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
  });
});

describe('cancelBooking', () => {
  beforeEach(() => {
    resetBookings();
    resetAuditTrail();
  });

  it('cancels a confirmed booking', () => {
    const { booking } = createBooking(base);

    const { booking: cancelled, cancelled: wasCancelled } = cancelBooking(booking.id, 'Alice');

    expect(wasCancelled).toBe(true);
    expect(cancelled.status).toBe('cancelled');
  });

  it('is idempotent — cancelling an already-cancelled booking does not error or re-process', () => {
    const { booking } = createBooking(base);
    cancelBooking(booking.id, 'Alice');

    const second = cancelBooking(booking.id, 'Alice');

    expect(second.cancelled).toBe(false);
    expect(second.booking.status).toBe('cancelled');
  });

  it('throws BookingNotFoundError for an id that does not exist', () => {
    expect(() => cancelBooking('booking-999', 'Alice')).toThrow(BookingNotFoundError);
  });

  it('frees the slot for a new booking once cancelled', () => {
    const { booking } = createBooking(base);
    cancelBooking(booking.id, 'Alice');

    // Same field/time, different customer — would have been a conflict
    // against the old (still-confirmed) booking, but the slot is free now.
    const { created } = createBooking({ ...base, customerName: 'Bob' });

    expect(created).toBe(true);
  });
});

describe('audit trail integration', () => {
  beforeEach(() => {
    resetBookings();
    resetAuditTrail();
  });

  it('records a "created" entry when a booking is made', () => {
    const { booking } = createBooking(base);

    const entries = listAuditEntries(booking.id);

    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('created');
    expect(entries[0].actor).toBe('Alice');
    expect(entries[0].timestamp).toEqual(expect.any(String));
  });

  it('records a "cancelled" entry when a booking is cancelled, on top of the "created" entry', () => {
    const { booking } = createBooking(base);
    cancelBooking(booking.id, 'Alice');

    const entries = listAuditEntries(booking.id);

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.action)).toEqual(['created', 'cancelled']);
  });

  it('does not add a duplicate audit entry when cancelling twice', () => {
    const { booking } = createBooking(base);
    cancelBooking(booking.id, 'Alice');
    cancelBooking(booking.id, 'Alice');

    expect(listAuditEntries(booking.id)).toHaveLength(2);
  });
});
