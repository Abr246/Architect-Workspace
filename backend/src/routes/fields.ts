import { Router } from 'express';
import { getAvailableFields } from '../services/fieldsService';

const router = Router();

router.get('/', (_req, res) => {
  try {
    res.json({ fields: getAvailableFields() });
  } catch (err) {
    // Covers this story's "Incorrect field status" failure path: if the
    // fields data is malformed in a way the service can't reconcile, fail
    // safe with a generic message rather than leaking internals or letting
    // an unhandled exception take the process down.
    // eslint-disable-next-line no-console
    console.error('[fields] FieldsQueryError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to load fields right now. Please try again shortly.' });
  }
});

export default router;
