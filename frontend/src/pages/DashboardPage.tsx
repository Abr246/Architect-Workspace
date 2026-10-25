import { useEffect, useState } from 'react';
import { fetchAvailableFields, Field } from '../services/fieldsApi';
import { fetchAllBookings, Booking } from '../services/bookingsApi';
import { fetchPendingEscalations, fetchAllEscalations, Escalation } from '../services/escalationsApi';
import { fetchOpenIssues, SchedulingIssue } from '../services/schedulingIssuesApi';
import { fetchAuditEntries } from '../services/auditTrailApi';
import { buildActivityFeed, fieldLabel, ActivityItem } from '../utils/activityFeed';

type LoadState = 'loading' | 'error' | 'ready';

type DashboardView = 'booking' | 'bookings';

interface Props {
  onNavigate: (view: DashboardView) => void;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isCurrentlyBooked(fieldId: string, bookings: Booking[]): boolean {
  const now = Date.now();
  return bookings.some(
    (b) =>
      b.fieldId === fieldId &&
      b.status === 'confirmed' &&
      new Date(b.startTime).getTime() <= now &&
      now < new Date(b.endTime).getTime(),
  );
}

export function DashboardPage({ onNavigate }: Props) {
  const [state, setState] = useState<LoadState>('loading');
  const [fields, setFields] = useState<Field[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingEscalations, setPendingEscalations] = useState<Escalation[]>([]);
  const [openIssues, setOpenIssues] = useState<SchedulingIssue[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchAvailableFields(),
      fetchAllBookings(),
      fetchPendingEscalations(),
      fetchOpenIssues(),
      fetchAuditEntries('booking'),
      fetchAuditEntries('scheduling_issue'),
      fetchAuditEntries('customer_issue'),
      fetchAllEscalations(),
    ])
      .then(([fieldsData, bookingsData, pendingData, issuesData, bookingEntries, issueEntries, customerIssueEntries, allEscalations]) => {
        if (cancelled) return;
        setFields(fieldsData);
        setBookings(bookingsData);
        setPendingEscalations(pendingData);
        setOpenIssues(issuesData);
        setActivity(buildActivityFeed(bookingEntries, issueEntries, customerIssueEntries, allEscalations, fieldsData));
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <p className="gk-status">Loading dashboard…</p>;
  }

  if (state === 'error') {
    return <p role="alert">Couldn't load the dashboard right now. Please try again shortly.</p>;
  }

  const todaysBookings = bookings
    .filter((b) => isToday(b.startTime))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="gk-page">
      <h1>Dashboard</h1>
      <p className="gk-page__intro">A quick overview of today's activity across GoalKick.</p>

      <div className="gk-summary-grid">
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">🏟️</span>
          <span className="gk-summary-card__value">{fields.length}</span>
          <span className="gk-summary-card__label">Available Fields</span>
        </div>
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">📅</span>
          <span className="gk-summary-card__value">{todaysBookings.length}</span>
          <span className="gk-summary-card__label">Today's Bookings</span>
        </div>
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">⏳</span>
          <span className="gk-summary-card__value">{pendingEscalations.length}</span>
          <span className="gk-summary-card__label">Pending Approvals</span>
        </div>
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">⚠️</span>
          <span className="gk-summary-card__value">{openIssues.length}</span>
          <span className="gk-summary-card__label">Scheduling Issues</span>
        </div>
      </div>

      <h2>Today's bookings</h2>
      <div className="gk-card">
        {todaysBookings.length === 0 ? (
          <p className="gk-empty-row">
            <span className="gk-empty-row__icon" aria-hidden="true">📅</span>
            No bookings scheduled for today.
          </p>
        ) : (
          <table className="gk-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Field</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todaysBookings.slice(0, 5).map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.customerName}</td>
                  <td>{fieldLabel(fields, booking.fieldId)}</td>
                  <td>
                    {new Date(booking.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} –{' '}
                    {new Date(booking.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td>{booking.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Field availability</h2>
      <div className="gk-card">
        {fields.length === 0 ? (
          <p className="gk-empty-row">
            <span className="gk-empty-row__icon" aria-hidden="true">🏟️</span>
            No fields to show right now.
          </p>
        ) : (
          <ul className="gk-field-status-list">
            {fields.map((field) => {
              const booked = isCurrentlyBooked(field.id, bookings);
              return (
                <li key={field.id} className="gk-field-status-row">
                  <span className="gk-field-status-row__name">{field.name}</span>
                  <span className={`gk-badge ${booked ? 'gk-badge--booked' : 'gk-badge--available'}`}>
                    <span className="gk-badge__dot" aria-hidden="true" />
                    {booked ? 'Booked' : 'Available'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <h2>Recent activity</h2>
      <div className="gk-card">
        {activity.length === 0 ? (
          <p className="gk-empty-row">
            <span className="gk-empty-row__icon" aria-hidden="true">🕒</span>
            Nothing has happened yet.
          </p>
        ) : (
          <ul className="gk-activity-list">
            {activity.map((item) => (
              <li key={item.id} className="gk-activity-item">
                <span className="gk-activity-item__icon" aria-hidden="true">{item.icon}</span>
                <span className="gk-activity-item__label">{item.label}</span>
                <span className="gk-activity-item__time">{new Date(item.timestamp).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2>Quick actions</h2>
      <div className="gk-quick-actions">
        <button type="button" className="gk-button gk-button--primary" onClick={() => onNavigate('booking')}>
          Book a Field
        </button>
        <button type="button" className="gk-button gk-button--secondary" onClick={() => onNavigate('bookings')}>
          View Bookings
        </button>
        <button type="button" className="gk-button gk-button--secondary" onClick={() => onNavigate('booking')}>
          Manage Fields
        </button>
      </div>
    </div>
  );
}
