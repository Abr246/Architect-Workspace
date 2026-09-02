import { createBooking, resetBookings, BookingConflictError } from './bookingsService';

const base = {
  fieldId: 'field-1',
  customerName: 'Alice',
  startTime: '2026-09-05T10:00:00.000Z',
  endTime: '2026-09-05T11:00:00.000Z',
};

describe('createBooking', () => {
  beforeEach(() => {
    resetBookings();
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
