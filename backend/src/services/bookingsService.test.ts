import {
  createBooking,
  cancelBooking,
  checkForConflict,
  resetBookings,
  BookingConflictError,
  BookingNotFoundError,
} from './bookingsService';
import { listAuditEntries, resetAuditTrail } from './auditTrailService';
import { listSchedulingIssues, resetSchedulingIssues } from './schedulingIssuesService';
import * as schedulingIssuesService from './schedulingIssuesService';

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
    resetSchedulingIssues();
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

  afterEach(() => {
    // Using afterEach rather than a manual logSpy.mockRestore() at the end
    // of each test body — that pattern only runs on success, so a failing
    // assertion leaves the spy (and its call history) leaking into the
    // next test. This guarantees cleanup either way.
    jest.restoreAllMocks();
  });

  function loggedEventsOf(logSpy: jest.SpyInstance, event: string) {
    return logSpy.mock.calls.map((call) => JSON.parse(call[0] as string)).filter((entry) => entry.event === event);
  }

  it('logs customer details and a timestamp when a booking is actually created', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    createBooking(base);

    const createdLogs = loggedEventsOf(logSpy, 'booking_created');
    expect(createdLogs).toHaveLength(1);
    expect(createdLogs[0].context.customerName).toBe('Alice');
    expect(createdLogs[0].context.fieldId).toBe('field-1');
    expect(createdLogs[0].timestamp).toEqual(expect.any(String));
    expect(new Date(createdLogs[0].timestamp).toString()).not.toBe('Invalid Date');
  });

  it('does not log a second "booking_created" event on an idempotent retry', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    createBooking(base);
    createBooking(base); // identical retry — same request as above

    expect(loggedEventsOf(logSpy, 'booking_created')).toHaveLength(1);
  });
});

describe('checkForConflict', () => {
  beforeEach(() => {
    resetBookings();
    resetAuditTrail();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('confirms no conflict when no bookings exist yet', () => {
    const result = checkForConflict(base.fieldId, base.startTime, base.endTime);

    expect(result.hasConflict).toBe(false);
    expect(result.conflictingBooking).toBeNull();
  });

  it('identifies a conflict when a new booking overlaps an existing one', () => {
    const { booking } = createBooking(base);

    const result = checkForConflict(base.fieldId, '2026-09-05T10:30:00.000Z', '2026-09-05T11:30:00.000Z');

    expect(result.hasConflict).toBe(true);
    expect(result.conflictingBooking?.id).toBe(booking.id);
  });

  it('confirms no conflict for a non-overlapping (adjacent) time on the same field', () => {
    createBooking(base);

    const result = checkForConflict(base.fieldId, '2026-09-05T11:00:00.000Z', '2026-09-05T12:00:00.000Z');

    expect(result.hasConflict).toBe(false);
  });

  it('does not flag a false-positive conflict against a cancelled booking', () => {
    const { booking } = createBooking(base);
    cancelBooking(booking.id, base.customerName);

    const result = checkForConflict(base.fieldId, base.startTime, base.endTime);

    expect(result.hasConflict).toBe(false);
  });

  it('logs every check, including ones with no conflict', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    checkForConflict(base.fieldId, base.startTime, base.endTime);

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(logged.event).toBe('conflict_check');
    expect(logged.context.hasConflict).toBe(false);
    expect(logged.timestamp).toEqual(expect.any(String));
  });

  it('logs a conflict check that finds a conflict, including the conflicting booking id', () => {
    const { booking } = createBooking(base);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    checkForConflict(base.fieldId, base.startTime, base.endTime);

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(logged.context.hasConflict).toBe(true);
    expect(logged.context.conflictingBookingId).toBe(booking.id);
  });

  it('still returns the correct result even if logging itself fails', () => {
    // "Logging failure" — a broken logger must never break the actual
    // conflict check it's supposed to be observing.
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('simulated logger crash');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = checkForConflict(base.fieldId, base.startTime, base.endTime);

    expect(result.hasConflict).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
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

describe('createBooking — scheduling issue reporting (STORY-012)', () => {
  beforeEach(() => {
    resetBookings();
    resetAuditTrail();
    resetSchedulingIssues();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports a scheduling issue when a genuine conflict occurs between two different customers', () => {
    createBooking(base);

    expect(() =>
      createBooking({
        ...base,
        customerName: 'Bob',
        startTime: '2026-09-05T10:30:00.000Z',
        endTime: '2026-09-05T11:30:00.000Z',
      }),
    ).toThrow(BookingConflictError);

    const openIssues = listSchedulingIssues('open');
    expect(openIssues).toHaveLength(1);
    expect(openIssues[0].fieldId).toBe('field-1');
    expect(openIssues[0].details.requestedBy).toBe('Bob');
  });

  it('does not report a scheduling issue for an idempotent retry (not a real conflict)', () => {
    createBooking(base);
    createBooking(base); // identical retry — same request as above, not a conflict

    expect(listSchedulingIssues('open')).toHaveLength(0);
  });

  it('still rejects the customer correctly even if scheduling-issue reporting itself fails ("Notifications are not sent to the scheduler")', () => {
    createBooking(base);
    jest.spyOn(schedulingIssuesService, 'reportSchedulingConflict').mockImplementation(() => {
      throw new Error('simulated notification failure');
    });

    // The customer-facing rejection must still happen correctly — a
    // broken notification side channel can never mask or replace it.
    expect(() =>
      createBooking({
        ...base,
        customerName: 'Bob',
        startTime: '2026-09-05T10:30:00.000Z',
        endTime: '2026-09-05T11:30:00.000Z',
      }),
    ).toThrow(BookingConflictError);
  });
});
