import { Booking } from '../services/bookingsApi';
import { Field } from '../services/fieldsApi';
import {
  bookingDurationHours,
  bookingRevenue,
  buildFieldPerformance,
  buildPeakHours,
  buildTrendBuckets,
  computeAnalyticsSummary,
  filterBookingsInRange,
  formatCurrency,
} from './analyticsMetrics';

const fields: Field[] = [
  {
    id: 'field-1',
    name: 'Riverside Pitch',
    location: 'North Park',
    surfaceType: 'grass',
    pricePerHour: 40,
    available: true,
    sizeFormat: '11v11',
    description: '',
    amenities: [],
  },
  {
    id: 'field-2',
    name: 'Downtown Turf',
    location: 'Central Complex',
    surfaceType: 'artificial turf',
    pricePerHour: 60,
    available: true,
    sizeFormat: '7v7',
    description: '',
    amenities: [],
  },
];

const now = new Date('2026-06-15T12:00:00.000Z');

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: 'booking-1',
    fieldId: 'field-1',
    customerName: 'John Smith',
    startTime: '2026-06-14T19:00:00.000Z',
    endTime: '2026-06-14T20:00:00.000Z',
    createdAt: '2026-06-10T00:00:00.000Z',
    status: 'confirmed',
    ...overrides,
  };
}

describe('bookingDurationHours', () => {
  it('computes the duration in hours from start to end', () => {
    expect(bookingDurationHours(booking({ startTime: '2026-06-14T19:00:00.000Z', endTime: '2026-06-14T21:00:00.000Z' }))).toBe(2);
  });
});

describe('bookingRevenue', () => {
  it('multiplies duration by the field\'s real hourly price', () => {
    expect(bookingRevenue(booking({ fieldId: 'field-2' }), fields)).toBe(60);
  });

  it('is 0 when the booking references a field that no longer exists, rather than throwing', () => {
    expect(bookingRevenue(booking({ fieldId: 'ghost-field' }), fields)).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats a whole-dollar amount with a leading sign and thousands separators', () => {
    expect(formatCurrency(1234)).toBe('$1,234');
  });

  it('rounds fractional amounts', () => {
    expect(formatCurrency(39.6)).toBe('$40');
  });
});

describe('filterBookingsInRange', () => {
  it('excludes a booking older than the selected window', () => {
    const old = booking({ startTime: '2026-05-01T19:00:00.000Z', endTime: '2026-05-01T20:00:00.000Z' });
    expect(filterBookingsInRange([old], 7, now)).toEqual([]);
  });

  it('includes a booking inside the selected window', () => {
    const recent = booking({ startTime: '2026-06-14T19:00:00.000Z', endTime: '2026-06-14T20:00:00.000Z' });
    expect(filterBookingsInRange([recent], 7, now)).toEqual([recent]);
  });

  it('excludes cancelled bookings even if they are inside the window', () => {
    const cancelled = booking({ status: 'cancelled' });
    expect(filterBookingsInRange([cancelled], 7, now)).toEqual([]);
  });

  it('excludes a booking in the future relative to "now"', () => {
    const future = booking({ startTime: '2026-07-01T19:00:00.000Z', endTime: '2026-07-01T20:00:00.000Z' });
    expect(filterBookingsInRange([future], 90, now)).toEqual([]);
  });
});

describe('computeAnalyticsSummary', () => {
  it('returns honest zeros instead of NaN or fabricated numbers when there are no bookings', () => {
    const summary = computeAnalyticsSummary([], fields, 7, now);
    expect(summary).toEqual({ totalBookings: 0, totalRevenue: 0, averageBookingValue: 0, utilizationPercent: 0 });
  });

  it('computes totals, average, and utilization from real bookings', () => {
    const bookings = [
      booking({ id: 'b1', fieldId: 'field-1', startTime: '2026-06-14T19:00:00.000Z', endTime: '2026-06-14T20:00:00.000Z' }),
      booking({ id: 'b2', fieldId: 'field-2', startTime: '2026-06-13T19:00:00.000Z', endTime: '2026-06-13T20:00:00.000Z' }),
    ];
    const summary = computeAnalyticsSummary(bookings, fields, 7, now);

    expect(summary.totalBookings).toBe(2);
    expect(summary.totalRevenue).toBe(100); // $40 + $60
    expect(summary.averageBookingValue).toBe(50);
    // 2 booked hours out of (14 operating hours * 7 days * 2 fields = 196) available hours.
    expect(summary.utilizationPercent).toBe(1);
  });
});

describe('buildFieldPerformance', () => {
  it('ranks fields by revenue and reports an honest zero for a field with no bookings in range', () => {
    const bookings = [booking({ fieldId: 'field-2', startTime: '2026-06-14T19:00:00.000Z', endTime: '2026-06-14T20:00:00.000Z' })];
    const rows = buildFieldPerformance(fields, bookings, 7, now);

    expect(rows[0]).toMatchObject({ fieldId: 'field-2', name: 'Downtown Turf', bookingCount: 1, revenue: 60 });
    expect(rows[1]).toMatchObject({ fieldId: 'field-1', name: 'Riverside Pitch', bookingCount: 0, revenue: 0, utilizationPercent: 0 });
  });
});

describe('buildTrendBuckets', () => {
  it('builds one bucket per day for a 7-day range', () => {
    const bookings = [booking({ startTime: '2026-06-14T19:00:00.000Z', endTime: '2026-06-14T20:00:00.000Z' })];
    const buckets = buildTrendBuckets(bookings, fields, 7, now);

    expect(buckets).toHaveLength(7);
    expect(buckets.reduce((sum, b) => sum + b.bookingCount, 0)).toBe(1);
    expect(buckets.reduce((sum, b) => sum + b.revenue, 0)).toBe(40);
  });

  it('groups a 30-day range into weekly buckets instead of 30 daily ones', () => {
    const buckets = buildTrendBuckets([], fields, 30, now);
    expect(buckets).toHaveLength(5); // ceil(30 / 7)
  });
});

describe('buildPeakHours', () => {
  it('counts bookings by the local hour they start in, across every operating hour', () => {
    const bookings = [booking({ startTime: '2026-06-14T19:00:00.000Z', endTime: '2026-06-14T20:00:00.000Z' })];
    const peaks = buildPeakHours(bookings, 7, now);

    const localHour = new Date('2026-06-14T19:00:00.000Z').getHours();
    expect(peaks.find((p) => p.hour === localHour)?.count).toBe(1);
    expect(peaks.reduce((sum, p) => sum + p.count, 0)).toBe(1);
  });

  it('returns a zero-count row for every operating hour when there are no bookings', () => {
    const peaks = buildPeakHours([], 7, now);
    expect(peaks.every((p) => p.count === 0)).toBe(true);
    expect(peaks).toHaveLength(14);
  });
});
