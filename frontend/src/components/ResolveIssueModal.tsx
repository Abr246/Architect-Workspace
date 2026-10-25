import { FormEvent, useState } from 'react';
import { SchedulingIssue, resolveIssue } from '../services/schedulingIssuesApi';
import { Booking, cancelBooking, createBooking, BookingResult } from '../services/bookingsApi';
import { Field } from '../services/fieldsApi';
import { fieldLabel } from '../utils/activityFeed';
import {
  OPERATING_HOURS,
  toIsoUtc,
  todayLocalDateString,
  localSlotValue,
  formatHourLabel,
  slotStatus,
} from '../utils/timeSlots';

interface Props {
  issue: SchedulingIssue;
  conflictingBooking: Booking | null;
  allBookings: Booking[];
  fields: Field[];
  onClose: () => void;
  onResolved: () => void;
}

type ResolveAction = 'mark-resolved' | 'cancel' | 'reschedule' | 'move';

function detailString(details: Record<string, unknown>, key: string): string {
  const value = details[key];
  return typeof value === 'string' ? value : '';
}

// BookingResult's success variants carry a `booking`, not a `message` - this
// reads whichever one applies instead of an unsafe cast at every call site.
function bookingResultMessage(result: BookingResult): string {
  return result.status === 'created' || result.status === 'idempotent'
    ? ''
    : result.message;
}

export function ResolveIssueModal({ issue, conflictingBooking, allBookings, fields, onClose, onResolved }: Props) {
  const [action, setAction] = useState<ResolveAction>('mark-resolved');
  const [resolvedBy, setResolvedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [newDate, setNewDate] = useState(todayLocalDateString());
  const [newStartTime, setNewStartTime] = useState('');
  const [targetFieldId, setTargetFieldId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedBy = detailString(issue.details, 'requestedBy') || 'a customer';
  const requestedStartTime = detailString(issue.details, 'requestedStartTime');
  const requestedEndTime = detailString(issue.details, 'requestedEndTime');

  const moveFieldOptions = fields.filter((f) => f.id !== (conflictingBooking?.fieldId ?? issue.fieldId));
  const slotFieldId = action === 'move' ? targetFieldId : conflictingBooking?.fieldId ?? issue.fieldId;
  const bookingsForSlotField = allBookings.filter((b) => b.fieldId === slotFieldId);

  function selectHour(hour: number) {
    setNewStartTime(localSlotValue(newDate, hour));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (action === 'mark-resolved') {
      const result = await resolveIssue(issue.id, resolvedBy, notes || undefined);
      setSubmitting(false);
      if (result.status === 'resolved') {
        onResolved();
        return;
      }
      setError(result.message);
      return;
    }

    if (!conflictingBooking) {
      setSubmitting(false);
      setError('The original booking could not be found, so it cannot be changed from here.');
      return;
    }

    if (action === 'reschedule' || action === 'move') {
      if (!newStartTime) {
        setSubmitting(false);
        setError('Please choose a new time.');
        return;
      }
      if (action === 'move' && !targetFieldId) {
        setSubmitting(false);
        setError('Please choose a field to move this booking to.');
        return;
      }
    }

    const cancelResult = await cancelBooking(conflictingBooking.id, resolvedBy);
    if (cancelResult.status !== 'cancelled') {
      setSubmitting(false);
      setError(cancelResult.message);
      return;
    }

    if (action === 'reschedule' || action === 'move') {
      const [hourStr] = newStartTime.split('T')[1].split(':');
      const newEndTime = localSlotValue(newDate, Number(hourStr) + 1);
      const targetField = action === 'move' ? targetFieldId : conflictingBooking.fieldId;

      const createResult = await createBooking({
        fieldId: targetField,
        customerName: conflictingBooking.customerName,
        startTime: toIsoUtc(newStartTime),
        endTime: toIsoUtc(newEndTime),
      });

      if (createResult.status !== 'created' && createResult.status !== 'idempotent') {
        setSubmitting(false);
        setError(
          `The original booking was cancelled, but rebooking the new time failed: ${bookingResultMessage(createResult)} Please rebook manually.`,
        );
        return;
      }
    }

    const resolveResult = await resolveIssue(issue.id, resolvedBy, notes || undefined);
    setSubmitting(false);
    if (resolveResult.status === 'resolved') {
      onResolved();
      return;
    }
    setError(resolveResult.message);
  }

  return (
    <div className="gk-modal-backdrop" onClick={onClose}>
      <div
        className="gk-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Resolve scheduling issue"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gk-booking-modal__header">
          <h2 className="gk-booking-modal__title">Resolve scheduling issue</h2>
          <button type="button" className="gk-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="gk-conflict-bookings">
          <div className="gk-conflict-booking">
            <span className="gk-field-card__meta-label">Booking 1 (confirmed)</span>
            {conflictingBooking ? (
              <>
                <p className="gk-conflict-booking__name">{conflictingBooking.customerName}</p>
                <p className="gk-conflict-booking__field">{fieldLabel(fields, conflictingBooking.fieldId)}</p>
                <p className="gk-conflict-booking__time">
                  {new Date(conflictingBooking.startTime).toLocaleString()} –{' '}
                  {new Date(conflictingBooking.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </>
            ) : (
              <p className="gk-status">This booking could not be found — it may already have been cancelled.</p>
            )}
          </div>
          <div className="gk-conflict-booking">
            <span className="gk-field-card__meta-label">Booking 2 (requested, never created)</span>
            <p className="gk-conflict-booking__name">{requestedBy}</p>
            {requestedStartTime && (
              <p className="gk-conflict-booking__time">
                {new Date(requestedStartTime).toLocaleString()} –{' '}
                {requestedEndTime && new Date(requestedEndTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
            <p className="gk-notifications__item-subtitle">
              Declined automatically because of this conflict — no booking exists to change.
            </p>
          </div>
        </div>

        <form className="gk-form" onSubmit={handleSubmit}>
          <div className="gk-field">
            Action
            <div className="gk-action-choices">
              <button
                type="button"
                className={`gk-action-choice ${action === 'mark-resolved' ? 'gk-action-choice--selected' : ''}`}
                onClick={() => setAction('mark-resolved')}
              >
                Mark as resolved
              </button>
              <button
                type="button"
                className={`gk-action-choice ${action === 'cancel' ? 'gk-action-choice--selected' : ''}`}
                onClick={() => setAction('cancel')}
                disabled={!conflictingBooking}
              >
                Cancel booking
              </button>
              <button
                type="button"
                className={`gk-action-choice ${action === 'reschedule' ? 'gk-action-choice--selected' : ''}`}
                onClick={() => setAction('reschedule')}
                disabled={!conflictingBooking}
              >
                Change booking time
              </button>
              <button
                type="button"
                className={`gk-action-choice ${action === 'move' ? 'gk-action-choice--selected' : ''}`}
                onClick={() => setAction('move')}
                disabled={!conflictingBooking || moveFieldOptions.length === 0}
              >
                Move to another field
              </button>
            </div>
          </div>

          {action === 'move' && (
            <label className="gk-field">
              New field
              <select value={targetFieldId} onChange={(e) => setTargetFieldId(e.target.value)} required>
                <option value="">Choose a field…</option>
                {moveFieldOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(action === 'reschedule' || action === 'move') && (
            <>
              <label className="gk-field">
                Date
                <input
                  type="date"
                  value={newDate}
                  min={todayLocalDateString()}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    setNewStartTime('');
                  }}
                  required
                />
              </label>
              <div className="gk-slot-grid">
                {OPERATING_HOURS.map((hour) => {
                  const status = action === 'move' && !targetFieldId ? 'available' : slotStatus(newDate, hour, bookingsForSlotField);
                  const value = localSlotValue(newDate, hour);
                  const isSelected = newStartTime === value;
                  return (
                    <button
                      key={hour}
                      type="button"
                      disabled={status !== 'available' || (action === 'move' && !targetFieldId)}
                      className={`gk-slot gk-slot--${status} ${isSelected ? 'gk-slot--selected' : ''}`}
                      onClick={() => selectHour(hour)}
                    >
                      <span className="gk-slot__time">{formatHourLabel(hour)}</span>
                      <span className="gk-slot__status">{status === 'available' ? 'Available' : status === 'booked' ? 'Booked' : 'Past'}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <label className="gk-field">
            Resolved by
            <input type="text" value={resolvedBy} onChange={(e) => setResolvedBy(e.target.value)} required />
          </label>
          <label className="gk-field">
            Notes (optional)
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <button
            type="submit"
            className="gk-button gk-button--primary gk-button--block"
            disabled={
              submitting ||
              !resolvedBy ||
              ((action === 'reschedule' || action === 'move') && !newStartTime) ||
              (action === 'move' && !targetFieldId)
            }
          >
            {submitting ? 'Working…' : 'Confirm'}
          </button>

          {error && <p role="alert">{error}</p>}
        </form>
      </div>
    </div>
  );
}
