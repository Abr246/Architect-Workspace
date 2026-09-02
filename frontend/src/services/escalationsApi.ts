export interface Escalation {
  id: string;
  type: 'refund' | 'complaint';
  customerName: string;
  description: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNotes: string | null;
}

export async function fetchPendingEscalations(): Promise<Escalation[]> {
  const res = await fetch('/api/escalations?status=pending');
  if (!res.ok) {
    throw new Error(`Failed to load escalations (status ${res.status})`);
  }
  const data = await res.json();
  return data.escalations as Escalation[];
}

export type DecisionOutcome = 'approved' | 'denied';

export type DecisionResult =
  | { status: 'decided'; escalation: Escalation }
  | { status: 'conflict'; message: string }
  | { status: 'notfound'; message: string }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string };

export async function decideEscalation(
  id: string,
  decidedBy: string,
  outcome: DecisionOutcome,
  notes?: string,
): Promise<DecisionResult> {
  const res = await fetch(`/api/escalations/${id}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decidedBy, outcome, notes }),
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 200) return { status: 'decided', escalation: data.escalation };
  if (res.status === 409) {
    return { status: 'conflict', message: data.error ?? 'This escalation was already decided differently.' };
  }
  if (res.status === 404) {
    return { status: 'notfound', message: data.error ?? 'This escalation no longer exists.' };
  }
  if (res.status === 400) {
    return { status: 'invalid', message: data.error ?? 'Please check the decision details.' };
  }
  return { status: 'error', message: 'Unable to record this decision right now. Please try again shortly.' };
}
