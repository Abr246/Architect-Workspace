import { Booking } from '../services/bookingsApi';
import { Field } from '../services/fieldsApi';
import { OPERATING_HOURS, formatHourLabel } from './timeSlots';

export type DateRangeDays = 7 | 30 | 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

export function bookingDurationHours(booking: Booking): number {
  return (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (60 * 60 * 1000);
}

// No "revenue" field exists anywhere in the data model - this is a real
// number derived from two real ones (a booking's actual duration and its
// field's actual hourly price), not an invented or fabricated figure.
export function bookingRevenue(booking: Booking, fields: Field[]): number {
  const field = fields.find((f) => f.id === booking.fieldId);
  if (!field) return 0;
  return bookingDurationHours(booking) * field.pricePerHour;
}

// Cancelled bookings never happened as real activity and generate no
// revenue, so every metric on this page is scoped to confirmed bookings
// whose start time falls inside the selected look-back window.
export function filterBookingsInRange(bookings: Booking[], days: DateRangeDays, now: Date = new Date()): Booking[] {
  const cutoff = now.getTime() - days * DAY_MS;
  return bookings.filter((b) => {
    if (b.status !== 'confirmed') return false;
    const t = new Date(b.startTime).getTime();
    return t >= cutoff && t <= now.getTime();
  });
}

function utilizationPercent(bookedHours: number, slotCount: number, days: DateRangeDays): number {
  const availableHours = OPERATING_HOURS.length * days * slotCount;
  if (availableHours <= 0) return 0;
  return Math.round((bookedHours / availableHours) * 100);
}

export interface AnalyticsSummary {
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  utilizationPercent: number;
}

export function computeAnalyticsSummary(
  bookings: Booking[],
  fields: Field[],
  days: DateRangeDays,
  now: Date = new Date(),
): AnalyticsSummary {
  const inRange = filterBookingsInRange(bookings, days, now);
  const totalBookings = inRange.length;
  const totalRevenue = inRange.reduce((sum, b) => sum + bookingRevenue(b, fields), 0);
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const bookedHours = inRange.reduce((sum, b) => sum + bookingDurationHours(b), 0);

  return {
    totalBookings,
    totalRevenue,
    averageBookingValue,
    utilizationPercent: utilizationPercent(bookedHours, fields.length, days),
  };
}

export interface FieldPerformance {
  fieldId: string;
  name: string;
  bookingCount: number;
  revenue: number;
  utilizationPercent: number;
}

export function buildFieldPerformance(
  fields: Field[],
  bookings: Booking[],
  days: DateRangeDays,
  now: Date = new Date(),
): FieldPerformance[] {
  const inRange = filterBookingsInRange(bookings, days, now);

  return fields
    .map((field) => {
      const fieldBookings = inRange.filter((b) => b.fieldId === field.id);
      const bookedHours = fieldBookings.reduce((sum, b) => sum + bookingDurationHours(b), 0);

      return {
        fieldId: field.id,
        name: field.name,
        bookingCount: fieldBookings.length,
        revenue: fieldBookings.reduce((sum, b) => sum + bookingRevenue(b, fields), 0),
        utilizationPercent: utilizationPercent(bookedHours, 1, days),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export interface TrendBucket {
  label: string;
  bookingCount: number;
  revenue: number;
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function formatWeekLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)}–${fmt(end)}`;
}

// 7 days reads best broken down by day; 30 and 90 days would be an
// unreadably dense wall of daily bars ("make the charts readable and not
// overly complicated"), so they're grouped into weekly buckets instead.
export function buildTrendBuckets(
  bookings: Booking[],
  fields: Field[],
  days: DateRangeDays,
  now: Date = new Date(),
): TrendBucket[] {
  const inRange = filterBookingsInRange(bookings, days, now);
  const bucketSizeDays = days === 7 ? 1 : 7;
  const bucketCount = Math.ceil(days / bucketSizeDays);

  const buckets: TrendBucket[] = [];
  for (let i = bucketCount - 1; i >= 0; i -= 1) {
    const bucketEnd = new Date(now.getTime() - i * bucketSizeDays * DAY_MS);
    const bucketStart = new Date(bucketEnd.getTime() - bucketSizeDays * DAY_MS);
    const bucketBookings = inRange.filter((b) => {
      const t = new Date(b.startTime).getTime();
      return t > bucketStart.getTime() && t <= bucketEnd.getTime();
    });

    buckets.push({
      label: bucketSizeDays === 1 ? formatDayLabel(bucketEnd) : formatWeekLabel(bucketStart, bucketEnd),
      bookingCount: bucketBookings.length,
      revenue: bucketBookings.reduce((sum, b) => sum + bookingRevenue(b, fields), 0),
    });
  }

  return buckets;
}

export interface PeakHourBucket {
  hour: number;
  label: string;
  count: number;
}

// Bucketed by the viewer's own local hour, same as the booking slot grid
// elsewhere in the app (BookingForm/FieldDetailsPage) - "5 PM is busy" is a
// statement about the wall clock a manager reads, not a UTC offset.
export function buildPeakHours(bookings: Booking[], days: DateRangeDays, now: Date = new Date()): PeakHourBucket[] {
  const inRange = filterBookingsInRange(bookings, days, now);

  return OPERATING_HOURS.map((hour) => ({
    hour,
    label: formatHourLabel(hour),
    count: inRange.filter((b) => new Date(b.startTime).getHours() === hour).length,
  }));
}
