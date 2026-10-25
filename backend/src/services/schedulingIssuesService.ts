import { db, nextSequenceNumber } from '../db/connection';
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

interface SchedulingIssueRow {
  id: string;
  type: 'conflict';
  field_id: string;
  details: string;
  status: SchedulingIssueStatus;
  detected_at: string;
  notified_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

function rowToIssue(row: SchedulingIssueRow): SchedulingIssue {
  return {
    id: row.id,
    type: row.type,
    fieldId: row.field_id,
    details: JSON.parse(row.details) as Record<string, unknown>,
    status: row.status,
    detectedAt: row.detected_at,
    notifiedAt: row.notified_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    resolutionNotes: row.resolution_notes,
  };
}

function loadAllIssues(): SchedulingIssue[] {
  const rows = db.prepare('SELECT * FROM scheduling_issues ORDER BY rowid ASC').all() as SchedulingIssueRow[];
  return rows.map(rowToIssue);
}

function getIssueRow(id: string): SchedulingIssue | null {
  const row = db.prepare('SELECT * FROM scheduling_issues WHERE id = ?').get(id) as SchedulingIssueRow | undefined;
  return row ? rowToIssue(row) : null;
}

const insertIssueStmt = db.prepare(
  `INSERT INTO scheduling_issues (id, type, field_id, details, status, detected_at, notified_at, resolved_at, resolved_by, resolution_notes)
   VALUES (@id, @type, @fieldId, @details, @status, @detectedAt, @notifiedAt, @resolvedAt, @resolvedBy, @resolutionNotes)`,
);

const updateResolutionStmt = db.prepare(
  'UPDATE scheduling_issues SET status = @status, resolved_at = @resolvedAt, resolved_by = @resolvedBy, resolution_notes = @resolutionNotes WHERE id = @id',
);

let nextId = nextSequenceNumber('scheduling_issues', 'issue');

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
  insertIssueStmt.run({ ...issue, details: JSON.stringify(issue.details) });

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
  const issue = getIssueRow(id);
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
  updateResolutionStmt.run({
    id: issue.id,
    status: issue.status,
    resolvedAt: issue.resolvedAt,
    resolvedBy: issue.resolvedBy,
    resolutionNotes: issue.resolutionNotes,
  });

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
  if (!status) return loadAllIssues();
  return loadAllIssues().filter((i) => i.status === status);
}

// Test-only: reset the store between test cases.
export function resetSchedulingIssues(): void {
  db.exec('DELETE FROM scheduling_issues');
  nextId = 1;
}
