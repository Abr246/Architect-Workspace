import { FormEvent, useState } from 'react';
import { Escalation, decideEscalation, DecisionOutcome } from '../services/escalationsApi';

interface Props {
  escalation: Escalation;
  onDecided: (id: string) => void;
}

// STORY-009: an explicit mapping, not a fallback ternary — a type this
// doesn't recognize now shows honestly rather than being silently
// mislabeled as something else (the bug a two-way ternary had when
// 'general' was added: anything non-'refund' fell through to "Complaint").
function escalationTypeLabel(type: Escalation['type']): string {
  switch (type) {
    case 'refund':
      return 'Refund request';
    case 'complaint':
      return 'Complaint';
    case 'general':
      return 'Customer issue';
    default:
      return 'Escalation';
  }
}

export function EscalationCard({ escalation, onDecided }: Props) {
  const [decidedBy, setDecidedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDecision(outcome: DecisionOutcome) {
    setSubmitting(true);
    setError(null);

    const result = await decideEscalation(escalation.id, decidedBy, outcome, notes || undefined);

    setSubmitting(false);

    if (result.status === 'decided') {
      onDecided(escalation.id);
      return;
    }
    setError(result.message);
  }

  function handleSubmit(e: FormEvent) {
    // The form only exists to make Enter-to-submit and label association
    // work naturally; the actual decision is which button was clicked.
    e.preventDefault();
  }

  return (
    <li className="gk-card">
      <form className="gk-form" onSubmit={handleSubmit}>
        <div className="gk-card-row">
          <p>
            <strong>{escalationTypeLabel(escalation.type)}</strong> from {escalation.customerName}
          </p>
          <span className="gk-badge gk-badge--warning">
            <span className="gk-badge__dot" aria-hidden="true" />
            Awaiting decision
          </span>
        </div>
        <p>{escalation.description}</p>
        <label className="gk-field">
          Decided by
          <input type="text" value={decidedBy} onChange={(e) => setDecidedBy(e.target.value)} required />
        </label>
        <label className="gk-field">
          Notes (optional)
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="gk-form-actions">
          <button
            type="button"
            className="gk-button gk-button--primary"
            disabled={submitting || !decidedBy}
            onClick={() => handleDecision('approved')}
          >
            Approve
          </button>
          <button
            type="button"
            className="gk-button gk-button--danger"
            disabled={submitting || !decidedBy}
            onClick={() => handleDecision('denied')}
          >
            Deny
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
      </form>
    </li>
  );
}
