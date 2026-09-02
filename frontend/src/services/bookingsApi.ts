export interface Booking {
  id: string;
  fieldId: string;
  customerName: string;
  startTime: string;
  endTime: string;
  createdAt: string;
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
