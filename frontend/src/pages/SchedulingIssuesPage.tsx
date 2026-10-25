import { useEffect, useState } from 'react';
import { fetchAllSchedulingIssues, SchedulingIssue } from '../services/schedulingIssuesApi';
import { fetchAllBookings, Booking } from '../services/bookingsApi';
import { fetchAvailableFields, Field } from '../services/fieldsApi';
import { fieldLabel } from '../utils/activityFeed';
import { ResolveIssueModal } from '../components/ResolveIssueModal';

type LoadState = 'loading' | 'error' | 'ready';
type IssueFilter = 'all' | 'double-booking' | 'field-conflict' | 'maintenance' | 'resolved';

interface Props {
  onNavigate: (view: 'bookings') => void;
}

function detailString(details: Record<string, unknown>, key: string): string {
  const value = details[key];
  return typeof value === 'string' ? value : '';
}

export function SchedulingIssuesPage({ onNavigate }: Props) {
  const [issues, setIssues] = useState<SchedulingIssue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);

  function load() {
    setState('loading');
    Promise.all([fetchAllSchedulingIssues(), fetchAllBookings(), fetchAvailableFields()])
      .then(([issuesData, bookingsData, fieldsData]) => {
        setIssues(issuesData);
        setBookings(bookingsData);
        setFields(fieldsData);
        setState('ready');
      })
      .catch(() => {
        setState('error');
      });
  }

  useEffect(load, []);

  if (state === 'loading') {
    return <p className="gk-status">Loading scheduling issues…</p>;
  }

  if (state === 'error') {
    return <p role="alert">Couldn't load scheduling issues right now. Please try again shortly.</p>;
  }

  const openIssues = issues.filter((i) => i.status === 'open');
  const resolvedIssues = issues.filter((i) => i.status === 'resolved');
  // Every scheduling issue this system currently detects is a double-booking
  // over one field's time slot - the same real conflict, counted here from
  // two honest angles: how many conflicts, and how many distinct fields
  // they're spread across. "Maintenance" has no real data behind it yet
  // (no maintenance concept exists anywhere in this app), so it's shown
  // truthfully as zero rather than invented.
  const distinctFieldsAffected = new Set(openIssues.map((i) => i.fieldId)).size;

  const resolvingIssue = issues.find((i) => i.id === resolvingIssueId) ?? null;
  const resolvingConflictBooking = resolvingIssue
    ? bookings.find((b) => b.id === detailString(resolvingIssue.details, 'conflictingBookingId')) ?? null
    : null;

  const filteredIssues = (() => {
    switch (filter) {
      case 'double-booking':
      case 'field-conflict':
        return [...openIssues].sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
      case 'maintenance':
        return [];
      case 'resolved':
        return [...resolvedIssues].sort(
          (a, b) => new Date(b.resolvedAt ?? b.detectedAt).getTime() - new Date(a.resolvedAt ?? a.detectedAt).getTime(),
        );
      case 'all':
      default:
        return [
          ...[...openIssues].sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()),
          ...[...resolvedIssues].sort(
            (a, b) => new Date(b.resolvedAt ?? b.detectedAt).getTime() - new Date(a.resolvedAt ?? a.detectedAt).getTime(),
          ),
        ];
    }
  })();

  return (
    <div className="gk-page">
      <h1>Scheduling issues</h1>
      <p className="gk-page__intro">Your conflict center — see what needs attention and resolve it from here.</p>

      <div className="gk-summary-grid">
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">⚠️</span>
          <span className="gk-summary-card__value">{openIssues.length}</span>
          <span className="gk-summary-card__label">Active Issues</span>
        </div>
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">📅</span>
          <span className="gk-summary-card__value">{openIssues.length}</span>
          <span className="gk-summary-card__label">Double Bookings</span>
        </div>
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">🏟️</span>
          <span className="gk-summary-card__value">{distinctFieldsAffected}</span>
          <span className="gk-summary-card__label">Fields Affected</span>
        </div>
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">🔧</span>
          <span className="gk-summary-card__value">0</span>
          <span className="gk-summary-card__label">Maintenance Conflicts</span>
        </div>
      </div>

      <div className="gk-filter-tabs">
        {(['all', 'double-booking', 'field-conflict', 'maintenance', 'resolved'] as IssueFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`gk-filter-tab ${filter === f ? 'gk-filter-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' && 'All'}
            {f === 'double-booking' && 'Double Bookings'}
            {f === 'field-conflict' && 'Field Conflicts'}
            {f === 'maintenance' && 'Maintenance'}
            {f === 'resolved' && 'Resolved'}
          </button>
        ))}
      </div>

      <h2>Scheduling issues</h2>

      {issues.length === 0 ? (
        <div className="gk-empty-state">
          <span className="gk-empty-state__icon gk-empty-state__icon--success" aria-hidden="true">✓</span>
          <h3>All schedules look good</h3>
          <p>No scheduling conflicts require your attention right now.</p>
          <p className="gk-empty-state__summary">All fields are currently scheduled without conflicts.</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <p className="gk-status">No issues match this filter.</p>
      ) : (
        <ul className="gk-issues-list">
          {filteredIssues.map((issue) => {
            const requestedBy = detailString(issue.details, 'requestedBy') || 'A customer';
            const requestedStartTime = detailString(issue.details, 'requestedStartTime');
            const field = fieldLabel(fields, issue.fieldId);

            return (
              <li key={issue.id} className="gk-issue-card">
                <div className="gk-issue-card__header">
                  <span className="gk-issue-card__title">⚠️ Double Booking Detected</span>
                  <span className={`gk-badge ${issue.status === 'open' ? 'gk-badge--open' : 'gk-badge--available'}`}>
                    <span className="gk-badge__dot" aria-hidden="true" />
                    {issue.status === 'open' ? 'Open' : 'Resolved'}
                  </span>
                </div>
                <p className="gk-issue-card__field">{field}</p>
                {requestedStartTime && (
                  <p className="gk-issue-card__time">
                    {new Date(requestedStartTime).toLocaleDateString(undefined, { weekday: 'long' })},{' '}
                    {new Date(requestedStartTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}
                <p className="gk-issue-card__cause">
                  Two bookings are scheduled for {field} at the same time — {requestedBy} tried to book a slot that
                  was already taken.
                </p>
                <div className="gk-form-actions">
                  <button type="button" className="gk-button gk-button--secondary" onClick={() => onNavigate('bookings')}>
                    View Bookings
                  </button>
                  {issue.status === 'open' && (
                    <button
                      type="button"
                      className="gk-button gk-button--primary"
                      onClick={() => setResolvingIssueId(issue.id)}
                    >
                      Resolve Issue
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {resolvingIssue && (
        <ResolveIssueModal
          issue={resolvingIssue}
          conflictingBooking={resolvingConflictBooking}
          allBookings={bookings}
          fields={fields}
          onClose={() => setResolvingIssueId(null)}
          onResolved={() => {
            setResolvingIssueId(null);
            load();
          }}
        />
      )}
    </div>
  );
}
