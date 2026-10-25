import { Router } from 'express';
import { listAuditEntries, AuditEntityType } from '../services/auditTrailService';

const router = Router();

const VALID_ENTITY_TYPES: AuditEntityType[] = [
  'booking',
  'scheduling_issue',
  'ai_interaction',
  'customer_issue',
  'performance_optimization',
];

// This is the "audit trail is accessible for verification" acceptance
// criterion made real — a place to actually read the trail back, not
// just a promise that logging happened somewhere.
router.get('/', (req, res) => {
  const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined;
  const entityTypeParam = req.query.entityType;

  if (entityTypeParam !== undefined && !VALID_ENTITY_TYPES.includes(entityTypeParam as AuditEntityType)) {
    res.status(400).json({ error: 'Invalid entityType filter.', validValues: VALID_ENTITY_TYPES });
    return;
  }

  const entityType = entityTypeParam as AuditEntityType | undefined;
  res.status(200).json({ entries: listAuditEntries(entityId, entityType) });
});

export default router;
