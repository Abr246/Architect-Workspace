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

export type BookingResult =
  | { status: 'created'; booking: Booking }
  | { status: 'idempotent'; booking: Booking }
  | { status: 'conflict'; message: string }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string };

export async function createBooking(input: CreateBookingInput): Promise<BookingResult> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 201) return { status: 'created', booking: data.booking };
  if (res.status === 200) return { status: 'idempotent', booking: data.booking };
  if (res.status === 409) {
    return { status: 'conflict', message: data.error ?? 'This field is already booked for that time.' };
  }
  if (res.status === 400) {
    return { status: 'invalid', message: data.error ?? 'Please check your booking details.' };
  }
  return { status: 'error', message: 'Unable to create the booking right now. Please try again shortly.' };
}

export async function fetchAllBookings(): Promise<Booking[]> {
  const res = await fetch('/api/bookings');
  if (!res.ok) {
    throw new Error(`Failed to load bookings (status ${res.status})`);
  }
  const data = await res.json();
  return data.bookings as Booking[];
}

export type CancelBookingResult =
  | { status: 'cancelled'; booking: Booking }
  | { status: 'notfound'; message: string }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string };

// The backend's cancel endpoint (STORY-002) already existed and was already
// tested - this is the first frontend caller of it. `customerName` is
// recorded as the audit trail's `actor`, so a manager cancelling on a
// customer's behalf correctly shows up as who performed the cancellation,
// not as impersonating the original customer - the backend never validates
// that the two match.
export async function cancelBooking(id: string, customerName: string): Promise<CancelBookingResult> {
  const res = await fetch(`/api/bookings/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName }),
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 200) return { status: 'cancelled', booking: data.booking };
  if (res.status === 404) return { status: 'notfound', message: data.error ?? 'This booking no longer exists.' };
  if (res.status === 400) return { status: 'invalid', message: data.error ?? 'Please check the cancellation details.' };
  return { status: 'error', message: 'Unable to cancel this booking right now. Please try again shortly.' };
}
