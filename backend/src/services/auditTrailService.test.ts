import { recordAuditEntry, listAuditEntries, resetAuditTrail } from './auditTrailService';

describe('auditTrailService', () => {
  beforeEach(() => {
    resetAuditTrail();
  });

  it('records an entry with a generated id and timestamp', () => {
    const entry = recordAuditEntry({
      entityType: 'booking',
      entityId: 'booking-1',
      action: 'created',
      actor: 'Grace',
      details: { fieldId: 'field-1' },
    });

    expect(entry.id).toEqual(expect.any(String));
    expect(entry.timestamp).toEqual(expect.any(String));
    expect(new Date(entry.timestamp).toString()).not.toBe('Invalid Date');
    expect(entry.action).toBe('created');
    expect(entry.actor).toBe('Grace');
  });

  it('lists all entries when no entityId filter is given', () => {
    recordAuditEntry({ entityType: 'booking', entityId: 'booking-1', action: 'created', actor: 'Grace', details: {} });
    recordAuditEntry({ entityType: 'booking', entityId: 'booking-2', action: 'created', actor: 'Frank', details: {} });

    expect(listAuditEntries()).toHaveLength(2);
  });

  it('filters entries by entityId', () => {
    recordAuditEntry({ entityType: 'booking', entityId: 'booking-1', action: 'created', actor: 'Grace', details: {} });
    recordAuditEntry({ entityType: 'booking', entityId: 'booking-1', action: 'cancelled', actor: 'Grace', details: {} });
    recordAuditEntry({ entityType: 'booking', entityId: 'booking-2', action: 'created', actor: 'Frank', details: {} });

    const entries = listAuditEntries('booking-1');

    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.entityId === 'booking-1')).toBe(true);
  });
});
