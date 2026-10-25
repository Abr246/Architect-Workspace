import { FormEvent, useEffect, useRef, useState } from 'react';
import { createBooking, fetchAllBookings, Booking, BookingResult } from '../services/bookingsApi';
import { fetchSuggestions, SchedulingSuggestion, TimeSlot } from '../services/schedulingApi';
import {
  OPERATING_HOURS,
  toIsoUtc,
  toDatetimeLocalValue,
  todayLocalDateString,
  localSlotValue,
  formatHourLabel,
  slotStatus,
  formatSummaryDate,
} from '../utils/timeSlots';

interface Props {
  fieldId: string;
  fieldName: string;
  fieldLocation: string;
  fieldSurfaceType: string;
  fieldPricePerHour: number;
  onClose: () => void;
  // Lets a caller (the Field Details page) open this modal already looking
  // at the date the customer was just previewing, instead of always
  // resetting to today.
  initialDate?: string;
}

export function BookingForm({
  fieldId,
  fieldName,
  fieldLocation,
  fieldSurfaceType,
  fieldPricePerHour,
  onClose,
  initialDate,
}: Props) {
  const [customerName, setCustomerName] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate ?? todayLocalDateString());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion | null>(null);
  const [fieldBookings, setFieldBookings] = useState<Booking[]>([]);
  const [slotPreviewFailed, setSlotPreviewFailed] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // A best-effort preview of which hours are already booked, so the grid
  // can show "Booked" up front — purely a UX aid. If it fails to load, every
  // slot is just shown as selectable; the real conflict check still happens
  // server-side on submit exactly as before, so nothing incorrect can ever
  // actually get booked either way.
  useEffect(() => {
    let cancelled = false;
    fetchAllBookings()
      .then((all) => {
        if (cancelled) return;
        setFieldBookings(all.filter((b) => b.fieldId === fieldId));
      })
      .catch(() => {
        if (cancelled) return;
        setSlotPreviewFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  function selectHour(hour: number) {
    setStartTime(localSlotValue(selectedDate, hour));
    setEndTime(localSlotValue(selectedDate, hour + 1));
    setResult(null);
    setSuggestions(null);
  }

  function selectSuggestedSlot(slot: TimeSlot) {
    const localStart = toDatetimeLocalValue(slot.startTime);
    setStartTime(localStart);
    setEndTime(toDatetimeLocalValue(slot.endTime));
    setSelectedDate(localStart.split('T')[0]);
    setResult(null);
    setSuggestions(null);
  }

  if (result && (result.status === 'created' || result.status === 'idempotent')) {
    return (
      <div className="gk-modal-backdrop" onClick={onClose}>
        <div
          className="gk-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Booking confirmed for ${fieldName}`}
          onClick={(e) => e.stopPropagation()}
        >
          <p role="status">
            Booked {fieldName} for {customerName}, {new Date(result.booking.startTime).toLocaleString()} –{' '}
            {new Date(result.booking.endTime).toLocaleString()}.
          </p>
          <button type="button" className="gk-button gk-button--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gk-modal-backdrop" onClick={onClose}>
      <div
        className="gk-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Book ${fieldName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gk-booking-modal__header">
          <div>
            <h2 className="gk-booking-modal__title">{fieldName}</h2>
            <p className="gk-booking-modal__location">📍 {fieldLocation}</p>
          </div>
          <button type="button" className="gk-modal-close" onClick={onClose} aria-label="Close booking dialog">
            ×
          </button>
        </div>

        <div className="gk-booking-modal__facts">
          <div className="gk-field-card__meta-item">
            <span className="gk-field-card__meta-label">Surface</span>
            <span className="gk-field-card__meta-value">{fieldSurfaceType}</span>
          </div>
          <div className="gk-field-card__meta-item">
            <span className="gk-field-card__meta-label">Price</span>
            <span className="gk-field-card__price">${fieldPricePerHour}/hr</span>
          </div>
        </div>

        <form className="gk-form" onSubmit={handleSubmit}>
          <label className="gk-field">
            Your name
            <input
              ref={nameInputRef}
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </label>

          <label className="gk-field">
            Date
            <input
              type="date"
              value={selectedDate}
              min={todayLocalDateString()}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setStartTime('');
                setEndTime('');
                setResult(null);
                setSuggestions(null);
              }}
              required
            />
          </label>

          <div className="gk-slot-picker">
            <span className="gk-field-card__meta-label">Available times</span>
            <div className="gk-slot-grid">
              {OPERATING_HOURS.map((hour) => {
                const status = slotPreviewFailed ? 'available' : slotStatus(selectedDate, hour, fieldBookings);
                const value = localSlotValue(selectedDate, hour);
                const isSelected = startTime === value;
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={status !== 'available'}
                    className={`gk-slot gk-slot--${status} ${isSelected ? 'gk-slot--selected' : ''}`}
                    onClick={() => selectHour(hour)}
                  >
                    <span className="gk-slot__time">{formatHourLabel(hour)}</span>
                    <span className="gk-slot__status">
                      {status === 'available' ? 'Available' : status === 'booked' ? 'Booked' : 'Past'}
                    </span>
                  </button>
                );
              })}
            </div>
            {slotPreviewFailed && (
              <p className="gk-slot-picker__note">
                Couldn't check which times are already booked — pick a time and we'll confirm it when you book.
              </p>
            )}
          </div>

          <div className="gk-booking-summary">
            <h3 className="gk-booking-summary__title">Booking summary</h3>
            {startTime && endTime ? (
              <dl className="gk-booking-summary__list">
                <div>
                  <dt>Field</dt>
                  <dd>{fieldName}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatSummaryDate(selectedDate)}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>
                    {formatHourLabel(new Date(startTime).getHours())} – {formatHourLabel(new Date(endTime).getHours())}
                  </dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd className="gk-booking-summary__total">${fieldPricePerHour}</dd>
                </div>
              </dl>
            ) : (
              <p className="gk-status">Select a date and time to see your booking summary.</p>
            )}
          </div>

          <button
            type="submit"
            className="gk-button gk-button--primary gk-button--block"
            disabled={submitting || !customerName || !startTime || !endTime}
          >
            {submitting ? 'Booking…' : 'Confirm Booking'}
          </button>

          {result && <p role="alert">{result.message}</p>}

          {suggestions && suggestions.slots.length > 0 && (
            <div>
              <p>{suggestions.rationale}</p>
              <ul className="gk-list">
                {suggestions.slots.map((slot) => (
                  <li key={slot.startTime}>
                    <button type="button" className="gk-button gk-button--secondary" onClick={() => selectSuggestedSlot(slot)}>
                      {new Date(slot.startTime).toLocaleString()} – {new Date(slot.endTime).toLocaleString()}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
