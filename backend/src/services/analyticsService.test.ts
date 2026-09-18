import { generateAnalyticsReport } from './analyticsService';
import { createBooking, cancelBooking, resetBookings } from './bookingsService';
import * as bookingsService from './bookingsService';

// 2026-09-19 is a Saturday, 2026-09-20 a Sunday, 2026-09-22 a Tuesday —
// verified against the system clock before writing this, not assumed.
const saturday1 = { fieldId: 'field-1', customerName: 'A', startTime: '2026-09-19T09:00:00.000Z', endTime: '2026-09-19T10:00:00.000Z' };
const saturday2 = { fieldId: 'field-1', customerName: 'A', startTime: '2026-09-19T11:00:00.000Z', endTime: '2026-09-19T12:00:00.000Z' };
const saturday3 = { fieldId: 'field-2', customerName: 'B', startTime: '2026-09-19T09:00:00.000Z', endTime: '2026-09-19T10:00:00.000Z' };
const tuesday1 = { fieldId: 'field-2', customerName: 'C', startTime: '2026-09-22T15:00:00.000Z', endTime: '2026-09-22T16:00:00.000Z' };

describe('generateAnalyticsReport', () => {
  beforeEach(() => {
    resetBookings();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns one period per day of the week', () => {
    const report = generateAnalyticsReport();

    expect(report.periods).toHaveLength(7);
    expect(report.periods.map((p) => p.dayOfWeek)).toEqual([
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    ]);
  });

  it('identifies a day with above-average bookings as busy, matching the acceptance-criteria wording', () => {
    createBooking(saturday1);
    createBooking(saturday2);
    createBooking(saturday3);
    createBooking(tuesday1);

    const report = generateAnalyticsReport();
    const saturday = report.periods.find((p) => p.dayOfWeek === 'Saturday')!;

    expect(saturday.bookingCount).toBe(3);
    expect(saturday.trend).toBe('busy');
  });

  it('identifies a slow period — a day with below-average (here, zero) bookings', () => {
    createBooking(saturday1);
    createBooking(saturday2);
    createBooking(saturday3);
    createBooking(tuesday1);

    const report = generateAnalyticsReport();
    const sunday = report.periods.find((p) => p.dayOfWeek === 'Sunday')!;

    expect(sunday.bookingCount).toBe(0);
    expect(sunday.trend).toBe('slow');
    expect(report.summary).toMatch(/sunday/i);
  });

  it('does not count a cancelled booking toward its day\'s trend ("Incorrect trend identification" prevention)', () => {
    const { booking } = createBooking(saturday1);
    cancelBooking(booking.id, 'A');

    const report = generateAnalyticsReport();
    const saturday = report.periods.find((p) => p.dayOfWeek === 'Saturday')!;

    expect(saturday.bookingCount).toBe(0);
    expect(saturday.trend).toBe('normal'); // 0 bookings, 0 average — nothing to call busy or slow
  });

  it('classifies every day as normal when there is no booking data at all, rather than guessing', () => {
    const report = generateAnalyticsReport();

    expect(report.totalBookings).toBe(0);
    expect(report.periods.every((p) => p.trend === 'normal')).toBe(true);
  });

  it('classifies every day as normal when bookings are spread perfectly evenly', () => {
    // One booking on each of 7 distinct days of a single week => every day
    // has exactly the same count as the average, i.e. none of them is
    // actually busy or slow relative to the others.
    const days = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];
    days.forEach((date, i) => {
      createBooking({ fieldId: 'field-1', customerName: `C${i}`, startTime: `${date}T09:00:00.000Z`, endTime: `${date}T10:00:00.000Z` });
    });

    const report = generateAnalyticsReport();

    expect(report.periods.every((p) => p.trend === 'normal')).toBe(true);
  });

  it('propagates a failure from the booking system rather than fabricating a report ("Data analysis error")', () => {
    jest.spyOn(bookingsService, 'listBookings').mockImplementation(() => {
      throw new Error('simulated data access failure');
    });

    expect(() => generateAnalyticsReport()).toThrow('simulated data access failure');
  });
});

describe('generateAnalyticsReport — audit logging', () => {
  beforeEach(() => {
    resetBookings();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs the report with a data source and a timestamp', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    generateAnalyticsReport();

    const logged = logSpy.mock.calls
      .map((call) => JSON.parse(call[0] as string))
      .find((entry) => entry.event === 'analytics_report_generated');
    expect(logged).toBeDefined();
    expect(logged.context.dataSource).toBe('bookings');
    expect(logged.timestamp).toEqual(expect.any(String));
    expect(new Date(logged.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('still returns a correct report even if logging itself fails', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('simulated logger crash');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const report = generateAnalyticsReport();

    expect(report.periods).toHaveLength(7);
    expect(errorSpy).toHaveBeenCalled();
  });
});
