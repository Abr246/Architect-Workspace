export interface SchedulingIssue {
  id: string;
  type: 'conflict';
  fieldId: string;
  details: Record<string, unknown>;
  status: 'open' | 'resolved';
  detectedAt: string;
  notifiedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
}

export async function fetchOpenIssues(): Promise<SchedulingIssue[]> {
  const res = await fetch('/api/scheduling-issues?status=open');
  if (!res.ok) {
    throw new Error(`Failed to load scheduling issues (status ${res.status})`);
  }
  const data = await res.json();
  return data.issues as SchedulingIssue[];
}

export type ResolveResult =
  | { status: 'resolved'; issue: SchedulingIssue }
  | { status: 'notfound'; message: string }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string };

export async function resolveIssue(id: string, resolvedBy: string, notes?: string): Promise<ResolveResult> {
  try {
    const res = await fetch(`/api/scheduling-issues/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvedBy, notes }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 200) return { status: 'resolved', issue: data.issue };
    if (res.status === 404) return { status: 'notfound', message: data.error ?? 'This issue no longer exists.' };
    if (res.status === 400) return { status: 'invalid', message: data.error ?? 'Please check the resolution details.' };
    return { status: 'error', message: 'Unable to resolve this issue right now. Please try again shortly.' };
  } catch {
    return { status: 'error', message: 'Unable to resolve this issue right now. Please try again shortly.' };
  }
}
