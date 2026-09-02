import { FormEvent, useState } from 'react';
import { Escalation, decideEscalation, DecisionOutcome } from '../services/escalationsApi';

interface Props {
  escalation: Escalation;
  onDecided: (id: string) => void;
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
    <li>
      <form onSubmit={handleSubmit}>
        <p>
          <strong>{escalation.type === 'refund' ? 'Refund request' : 'Complaint'}</strong> from{' '}
          {escalation.customerName}
        </p>
        <p>{escalation.description}</p>
        <label>
          Decided by
          <input type="text" value={decidedBy} onChange={(e) => setDecidedBy(e.target.value)} required />
        </label>
        <label>
          Notes (optional)
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button type="button" disabled={submitting || !decidedBy} onClick={() => handleDecision('approved')}>
          Approve
        </button>
        <button type="button" disabled={submitting || !decidedBy} onClick={() => handleDecision('denied')}>
          Deny
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </li>
  );
}
