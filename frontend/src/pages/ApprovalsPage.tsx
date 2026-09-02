import { useEffect, useState } from 'react';
import { fetchPendingEscalations, Escalation } from '../services/escalationsApi';
import { EscalationCard } from '../components/EscalationCard';

type LoadState = 'loading' | 'error' | 'ready';

export function ApprovalsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;

    fetchPendingEscalations()
      .then((data) => {
        if (cancelled) return;
        setEscalations(data);
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

  function handleDecided(id: string) {
    setEscalations((current) => current.filter((e) => e.id !== id));
  }

  if (state === 'loading') {
    return <p>Loading pending approvals…</p>;
  }

  if (state === 'error') {
    return <p role="alert">Couldn't load pending approvals right now. Please try again shortly.</p>;
  }

  if (escalations.length === 0) {
    return <p>No refunds or complaints are waiting for approval.</p>;
  }

  return (
    <div>
      <h1>Pending approvals</h1>
      <ul>
        {escalations.map((escalation) => (
          <EscalationCard key={escalation.id} escalation={escalation} onDecided={handleDecided} />
        ))}
      </ul>
    </div>
  );
}
