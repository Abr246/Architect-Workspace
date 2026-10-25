import { Booking } from '../services/bookingsApi';

// The field is open for booking 8:00 AM through 10:00 PM, in 1-hour slots -
// a fixed, reasonable operating window (no per-field hours exist in the
// data model yet, and inventing one would be new scope beyond this pass).
export const OPERATING_HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

// datetime-local values (and the value this slot picker builds) give local
// time with no timezone (e.g. "2026-09-05T10:00"); the API expects a UTC
// ISO string ending in "Z".
export function toIsoUtc(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

// The inverse — an API ISO string back into the local, timezone-less
// datetime-local format, so a suggested slot can select itself the same way
// clicking a grid button would.
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayLocalDateString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function localSlotValue(dateStr: string, hour: number): string {
  return `${dateStr}T${String(hour).padStart(2, '0')}:00`;
}

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

export type SlotStatus = 'available' | 'booked' | 'past';

export function slotStatus(dateStr: string, hour: number, fieldBookings: Booking[]): SlotStatus {
  const startIso = toIsoUtc(localSlotValue(dateStr, hour));
  const endIso = toIsoUtc(localSlotValue(dateStr, hour + 1));

  if (new Date(endIso).getTime() <= Date.now()) {
    return 'past';
  }
  const isBooked = fieldBookings.some(
    (b) => b.status === 'confirmed' && timesOverlap(b.startTime, b.endTime, startIso, endIso),
  );
  return isBooked ? 'booked' : 'available';
}

export function formatSummaryDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
