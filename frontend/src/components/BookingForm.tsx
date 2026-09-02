import { FormEvent, useState } from 'react';
import { createBooking, BookingResult } from '../services/bookingsApi';

interface Props {
  fieldId: string;
  fieldName: string;
}

// datetime-local inputs give local time with no timezone (e.g.
// "2026-09-05T10:00"); the API expects a UTC ISO string ending in "Z".
function toIsoUtc(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

export function BookingForm({ fieldId, fieldName }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const outcome = await createBooking({
      fieldId,
      customerName,
      startTime: toIsoUtc(startTime),
      endTime: toIsoUtc(endTime),
    });

    setSubmitting(false);
    setResult(outcome);
  }

  if (result && (result.status === 'created' || result.status === 'idempotent')) {
    return (
      <p role="status">
        Booked {fieldName} for {customerName}, {new Date(result.booking.startTime).toLocaleString()} –{' '}
        {new Date(result.booking.endTime).toLocaleString()}.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
      </label>
      <label>
        Start
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
      </label>
      <label>
        End
        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Booking…' : 'Confirm booking'}
      </button>
      {result && <p role="alert">{result.message}</p>}
    </form>
  );
}
