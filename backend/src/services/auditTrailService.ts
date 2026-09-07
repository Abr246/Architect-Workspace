// STORY-012 widens both unions to admit scheduling issues alongside
// bookings — the audit trail itself (STORY-011) was always meant to be
// general-purpose, not booking-specific; this is its first real second
// user, not a special case bolted on.
export type AuditEntityType = 'booking' | 'scheduling_issue';
export type AuditAction = 'created' | 'cancelled' | 'detected' | 'resolved';

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

// The audit trail itself — a structured, queryable record, distinct from
// the console logging STORY-001/002/004 already do. Console output isn't
// "accessible for verification" in any structured sense; this is.
let entries: AuditEntry[] = [];
let nextId = 1;

export function recordAuditEntry(input: RecordAuditEntryInput): AuditEntry {
  const entry: AuditEntry = {
    id: `audit-${nextId++}`,
    ...input,
    timestamp: new Date().toISOString(),
  };
  entries.push(entry);
  return entry;
}

export function listAuditEntries(entityId?: string): AuditEntry[] {
  if (!entityId) return [...entries];
  return entries.filter((e) => e.entityId === entityId);
}

// Test-only: reset the in-memory store between test cases.
export function resetAuditTrail(): void {
  entries = [];
  nextId = 1;
}
