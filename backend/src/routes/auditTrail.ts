import { Router } from 'express';
import { listAuditEntries } from '../services/auditTrailService';

const router = Router();

// This is the "audit trail is accessible for verification" acceptance
// criterion made real — a place to actually read the trail back, not
// just a promise that logging happened somewhere.
router.get('/', (req, res) => {
  const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined;
  res.status(200).json({ entries: listAuditEntries(entityId) });
});

export default router;
