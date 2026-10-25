import { db, nextSequenceNumber } from '../db/connection';

// STORY-012 widened both unions to admit scheduling issues alongside
// bookings, STORY-003 widened them again for AI assistant interactions,
// STORY-009 widens them once more for the AI-or-human customer service
// flow, and STORY-010 widens them again for performance optimizations —
// the audit trail itself (STORY-011) was always meant to be
// general-purpose, not booking-specific; each of these is a real new
// user, not a special case bolted on.
export type AuditEntityType = 'booking' | 'scheduling_issue' | 'ai_interaction' | 'customer_issue' | 'performance_optimization';
export type AuditAction = 'created' | 'cancelled' | 'detected' | 'resolved' | 'answered' | 'escalated' | 'cache_hit';

export interface AuditEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface RecordAuditEntryInput {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actor: string;
  details: Record<string, unknown>;
}

interface AuditEntryRow {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  actor: string;
  timestamp: string;
  details: string;
}

function rowToEntry(row: AuditEntryRow): AuditEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actor: row.actor,
    timestamp: row.timestamp,
    details: JSON.parse(row.details) as Record<string, unknown>,
  };
}

// The audit trail itself — a structured, queryable record, distinct from
// the console logging STORY-001/002/004 already do. Console output isn't
// "accessible for verification" in any structured sense; this is.
let nextId = nextSequenceNumber('audit_entries', 'audit');

const insertEntry = db.prepare(
  'INSERT INTO audit_entries (id, entity_type, entity_id, action, actor, timestamp, details) VALUES (@id, @entityType, @entityId, @action, @actor, @timestamp, @details)',
);

export function recordAuditEntry(input: RecordAuditEntryInput): AuditEntry {
  const entry: AuditEntry = {
    id: `audit-${nextId++}`,
    ...input,
    timestamp: new Date().toISOString(),
  };
  insertEntry.run({ ...entry, details: JSON.stringify(entry.details) });
  return entry;
}

// entityType is a second, independent optional filter (not a breaking
// change to the existing entityId-only signature - every current caller
// still compiles and behaves identically) so a staff-facing view can ask
// "every ai_interaction" without needing to know any specific entityId.
export function listAuditEntries(entityId?: string, entityType?: AuditEntityType): AuditEntry[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (entityId) {
    conditions.push('entity_id = @entityId');
    params.entityId = entityId;
  }
  if (entityType) {
    conditions.push('entity_type = @entityType');
    params.entityType = entityType;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM audit_entries ${whereClause} ORDER BY rowid ASC`).all(params) as AuditEntryRow[];
  return rows.map(rowToEntry);
}

// Test-only: reset the store between test cases.
export function resetAuditTrail(): void {
  db.exec('DELETE FROM audit_entries');
  nextId = 1;
}
