import { FormEvent, useState } from 'react';
import { createBooking, BookingResult } from '../services/bookingsApi';
import { fetchSuggestions, SchedulingSuggestion, TimeSlot } from '../services/schedulingApi';

interface Props {
  fieldId: string;
  fieldName: string;
}

// datetime-local inputs give local time with no timezone (e.g.
// "2026-09-05T10:00"); the API expects a UTC ISO string ending in "Z".
function toIsoUtc(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

// The inverse — an API ISO string back into the local, timezone-less
// format a datetime-local input needs, so a suggested slot can pre-fill
// the form.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingForm({ fieldId, fieldName }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setSuggestions(null);

    const isoStart = toIsoUtc(startTime);
    const isoEnd = toIsoUtc(endTime);
    const outcome = await createBooking({ fieldId, customerName, startTime: isoStart, endTime: isoEnd });

    setSubmitting(false);
    setResult(outcome);

    if (outcome.status === 'conflict') {
      // STORY-006: the requested time is taken — ask the scheduling
      // suggestion engine for alternatives rather than leaving the
      // customer to guess at another time themselves.
      const suggestion = await fetchSuggestions(fieldId, isoStart, isoEnd);
      setSuggestions(suggestion);
    }
  }

  function selectSuggestedSlot(slot: TimeSlot) {
    setStartTime(toDatetimeLocalValue(slot.startTime));
    setEndTime(toDatetimeLocalValue(slot.endTime));
    setResult(null);
    setSuggestions(null);
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
      {suggestions && suggestions.slots.length > 0 && (
        <div>
          <p>{suggestions.rationale}</p>
          <ul>
            {suggestions.slots.map((slot) => (
              <li key={slot.startTime}>
                <button type="button" onClick={() => selectSuggestedSlot(slot)}>
                  {new Date(slot.startTime).toLocaleString()} – {new Date(slot.endTime).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
