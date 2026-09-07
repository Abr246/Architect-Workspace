import { recordAuditEntry } from './auditTrailService';

export type SchedulingIssueStatus = 'open' | 'resolved';

export interface SchedulingIssue {
  id: string;
  type: 'conflict';
  fieldId: string;
  details: Record<string, unknown>;
  status: SchedulingIssueStatus;
  detectedAt: string;
  notifiedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
}

export class SchedulingIssueNotFoundError extends Error {
  constructor(id: string) {
    super(`No scheduling issue found with id ${id}.`);
    this.name = 'SchedulingIssueNotFoundError';
  }
}

// Walking skeleton: in-memory store, same pattern as every other service
// in this build, until a real database lands in a later story.
let issues: SchedulingIssue[] = [];
let nextId = 1;

// Called from bookingsService when a genuine booking conflict is detected
// between two different customers (not an idempotent retry). "Notify the
// scheduler" is built as an in-app, immediately-queryable notification —
// no real email/SMS channel exists in this environment, and adding one
// needs credentials nobody has provided; same honest-substitution pattern
// as STORY-006's scheduling engine.
export function reportSchedulingConflict(fieldId: string, details: Record<string, unknown>): SchedulingIssue {
  const detectedAt = new Date().toISOString();
  const issue: SchedulingIssue = {
    id: `issue-${nextId++}`,
    type: 'conflict',
    fieldId,
    details,
    status: 'open',
    detectedAt,
    notifiedAt: detectedAt, // "notified immediately" — same instant as detection, not deferred
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
  };
  issues.push(issue);

  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp: detectedAt,
        level: 'warn',
        service: 'backend',
        event: 'scheduling_issue_detected',
        outcome: 'success',
        context: { issueId: issue.id, fieldId, ...details },
      }),
    );
  } catch (err) {
    // "Notifications are not sent to the scheduler" must never propagate
    // and take down the booking flow that triggered it.
    // eslint-disable-next-line no-console
    console.error('[scheduling-issues] NotificationLoggingError:', err instanceof Error ? err.message : err);
  }

  recordAuditEntry({
    entityType: 'scheduling_issue',
    entityId: issue.id,
    action: 'detected',
    actor: 'system',
    details: { fieldId, ...details },
  });

  return issue;
}

export function resolveSchedulingIssue(
  id: string,
  resolvedBy: string,
  notes?: string,
): { issue: SchedulingIssue; resolved: boolean } {
  const issue = issues.find((i) => i.id === id);
  if (!issue) {
    throw new SchedulingIssueNotFoundError(id);
  }

  if (issue.status === 'resolved') {
    // Idempotent: resolving something already resolved is the same end
    // state the caller asked for, not an error.
    return { issue, resolved: false };
  }

  issue.status = 'resolved';
  issue.resolvedAt = new Date().toISOString();
  issue.resolvedBy = resolvedBy;
  issue.resolutionNotes = notes ?? null;

  recordAuditEntry({
    entityType: 'scheduling_issue',
    entityId: issue.id,
    action: 'resolved',
    actor: resolvedBy,
    details: { fieldId: issue.fieldId },
  });

  return { issue, resolved: true };
}

export function listSchedulingIssues(status?: SchedulingIssueStatus): SchedulingIssue[] {
  if (!status) return [...issues];
  return issues.filter((i) => i.status === status);
}

// Test-only: reset the in-memory store between test cases.
export function resetSchedulingIssues(): void {
  issues = [];
  nextId = 1;
}
