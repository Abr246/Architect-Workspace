export type AuditEntityType =
  | 'booking'
  | 'scheduling_issue'
  | 'ai_interaction'
  | 'customer_issue'
  | 'performance_optimization';

export interface AuditEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export async function fetchAuditEntries(entityType: AuditEntityType): Promise<AuditEntry[]> {
  const res = await fetch(`/api/audit-trail?entityType=${entityType}`);
  if (!res.ok) {
    throw new Error(`Failed to load audit trail (status ${res.status})`);
  }
  const data = await res.json();
  return data.entries as AuditEntry[];
}

// `details` is an intentionally loose Record<string, unknown> on the
// backend (different entityTypes carry different shapes) - these read it
// back safely instead of an unchecked cast at every call site.
export function stringDetail(details: Record<string, unknown>, key: string): string {
  const value = details[key];
  return typeof value === 'string' ? value : '';
}

export function booleanDetail(details: Record<string, unknown>, key: string): boolean {
  return details[key] === true;
}

export function nullableStringDetail(details: Record<string, unknown>, key: string): string | null {
  const value = details[key];
  return typeof value === 'string' ? value : null;
}
