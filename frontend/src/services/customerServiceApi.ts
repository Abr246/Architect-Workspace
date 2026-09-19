export type CustomerIssueStatus = 'resolved' | 'escalated' | 'failed';

export interface CustomerIssueResult {
  status: CustomerIssueStatus;
  message: string;
  escalationId: string | null;
}

export type SubmitIssueOutcome =
  | { status: 'submitted'; result: CustomerIssueResult }
  | { status: 'error'; message: string };

export async function submitIssue(customerName: string, issue: string): Promise<SubmitIssueOutcome> {
  try {
    const res = await fetch('/api/customer-service/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, issue }),
    });

    if (!res.ok) {
      return { status: 'error', message: 'Unable to submit your issue right now. Please try again shortly.' };
    }

    const result = await res.json();
    return { status: 'submitted', result };
  } catch {
    return { status: 'error', message: 'Unable to submit your issue right now. Please try again shortly.' };
  }
}

export interface EscalationOutcome {
  status: 'pending' | 'approved' | 'denied';
  notified: boolean;
}

export type CheckStatusOutcome =
  | { status: 'found'; outcome: EscalationOutcome }
  | { status: 'notfound'; message: string }
  | { status: 'error'; message: string };

export async function checkIssueStatus(escalationId: string): Promise<CheckStatusOutcome> {
  try {
    const res = await fetch(`/api/customer-service/issues/${escalationId}`);

    if (res.status === 404) {
      return { status: 'notfound', message: 'We could not find that issue.' };
    }
    if (!res.ok) {
      return { status: 'error', message: 'Unable to check this issue right now. Please try again shortly.' };
    }

    const data = await res.json();
    return {
      status: 'found',
      outcome: { status: data.escalation.status, notified: data.escalation.customerNotifiedAt !== null },
    };
  } catch {
    return { status: 'error', message: 'Unable to check this issue right now. Please try again shortly.' };
  }
}
