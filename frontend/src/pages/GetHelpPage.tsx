import { FormEvent, useState } from 'react';
import {
  submitIssue,
  checkIssueStatus,
  CustomerIssueResult,
  CheckStatusOutcome,
} from '../services/customerServiceApi';

interface TrackedIssue {
  issue: string;
  result: CustomerIssueResult;
  statusCheck: CheckStatusOutcome | null;
}

export function GetHelpPage() {
  const [customerName, setCustomerName] = useState('');
  const [issue, setIssue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<TrackedIssue[]>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const submittedIssue = issue;
    const outcome = await submitIssue(customerName, submittedIssue);

    setSubmitting(false);

    if (outcome.status === 'submitted') {
      setLog((current) => [...current, { issue: submittedIssue, result: outcome.result, statusCheck: null }]);
      setIssue('');
    } else {
      setError(outcome.message);
    }
  }

  async function handleCheckStatus(index: number, escalationId: string) {
    const statusCheck = await checkIssueStatus(escalationId);
    setLog((current) => current.map((entry, i) => (i === index ? { ...entry, statusCheck } : entry)));
  }

  return (
    <div>
      <h1>Get help</h1>
      <p>Tell us what&apos;s going on. We&apos;ll answer right away if we can, or pass it to our team.</p>
      <ul>
        {log.map((entry, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={i}>
            <p>
              <strong>You:</strong> {entry.issue}
            </p>
            <p>
              <strong>Response:</strong> {entry.result.message}
            </p>
            {entry.result.status === 'escalated' && entry.result.escalationId && (
              <>
                <button type="button" onClick={() => handleCheckStatus(i, entry.result.escalationId as string)}>
                  Check status
                </button>
                <StatusDisplay statusCheck={entry.statusCheck} />
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <label>
          Your name
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </label>
        <label>
          What&apos;s going on?
          <input type="text" value={issue} onChange={(e) => setIssue(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </div>
  );
}

function StatusDisplay({ statusCheck }: { statusCheck: CheckStatusOutcome | null }) {
  if (!statusCheck) return null;

  if (statusCheck.status === 'found') {
    const { outcome } = statusCheck;
    if (outcome.status === 'pending') {
      return <p>Still pending review by our team.</p>;
    }
    return (
      <p>
        Outcome: {outcome.status}. {outcome.notified ? "You've been notified." : 'Notification pending.'}
      </p>
    );
  }

  return <p role="alert">{statusCheck.message}</p>;
}
