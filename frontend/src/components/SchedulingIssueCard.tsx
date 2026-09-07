import { FormEvent, useState } from 'react';
import { SchedulingIssue, resolveIssue } from '../services/schedulingIssuesApi';

interface Props {
  issue: SchedulingIssue;
  onResolved: (id: string) => void;
}

export function SchedulingIssueCard({ issue, onResolved }: Props) {
  const [resolvedBy, setResolvedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await resolveIssue(issue.id, resolvedBy, notes || undefined);

    setSubmitting(false);

    if (result.status === 'resolved') {
      onResolved(issue.id);
      return;
    }
    setError(result.message);
  }

  const requestedBy = typeof issue.details.requestedBy === 'string' ? issue.details.requestedBy : 'unknown customer';

  return (
    <li>
      <form onSubmit={handleResolve}>
        <p>
          <strong>Booking conflict</strong> on field {issue.fieldId} — {requestedBy} tried to book a time that was
          already taken.
        </p>
        <p>Detected {new Date(issue.detectedAt).toLocaleString()}.</p>
        <label>
          Resolved by
          <input type="text" value={resolvedBy} onChange={(e) => setResolvedBy(e.target.value)} required />
        </label>
        <label>
          Notes (optional)
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button type="submit" disabled={submitting || !resolvedBy}>
          Mark resolved
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </li>
  );
}
