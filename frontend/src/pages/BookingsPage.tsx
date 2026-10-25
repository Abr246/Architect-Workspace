import { useEffect, useRef, useState } from 'react';
import { fetchAllBookings, Booking } from '../services/bookingsApi';
import { fetchAvailableFields, Field } from '../services/fieldsApi';

type LoadState = 'loading' | 'error' | 'ready';

export const BOOKINGS_POLL_INTERVAL_MS = 5000;

function fieldLabel(fields: Field[], fieldId: string): string {
  const field = fields.find((f) => f.id === fieldId);
  return field ? `${field.name} — ${field.location}` : fieldId;
}

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function fetchData(): Promise<void> {
    return Promise.all([fetchAllBookings(), fetchAvailableFields()]).then(([bookingsData, fieldsData]) => {
      if (!mountedRef.current) return;
      const sorted = [...bookingsData].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setBookings(sorted);
      setFields(fieldsData);
    });
  }

  function load() {
    setState('loading');
    fetchData()
      .then(() => {
        if (mountedRef.current) setState('ready');
      })
      .catch(() => {
        if (mountedRef.current) setState('error');
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  // Auto-refresh in the background so a booking made elsewhere shows up
  // without a manual click. Deliberately silent on failure - a transient
  // blip here just tries again next tick rather than yanking away an
  // already-displayed, perfectly good list (that's still what the Refresh
  // button's loading/error states are for, since that's a deliberate,
  // user-initiated check).
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData().catch(() => {
        // Retried automatically on the next tick.
      });
    }, BOOKINGS_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return <p className="gk-status">Loading bookings…</p>;
  }

  if (state === 'error') {
    return <p role="alert">Couldn't load bookings right now. Please try again shortly.</p>;
  }

  return (
    <div className="gk-page">
      <div className="gk-page__header">
        <h1>All bookings</h1>
        <button type="button" className="gk-button gk-button--secondary" onClick={load}>
          Refresh
        </button>
      </div>
      <p className="gk-page__intro">Updates automatically every {BOOKINGS_POLL_INTERVAL_MS / 1000} seconds.</p>
      {bookings.length === 0 ? (
        <p className="gk-status">No bookings have been made yet.</p>
      ) : (
        <table className="gk-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Customer</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Booked at</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{fieldLabel(fields, booking.fieldId)}</td>
                <td>{booking.customerName}</td>
                <td>{new Date(booking.startTime).toLocaleString()}</td>
                <td>{new Date(booking.endTime).toLocaleString()}</td>
                <td>{booking.status}</td>
                <td>{new Date(booking.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
