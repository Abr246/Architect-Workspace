import { Router } from 'express';
import { generateAnalyticsReport } from '../services/analyticsService';

const router = Router();

router.get('/report', (_req, res) => {
  try {
    const report = generateAnalyticsReport();
    res.status(200).json(report);
  } catch (err) {
    // Covers "Data analysis error" — fail safe rather than leaking
    // internals or crashing the process.
    // eslint-disable-next-line no-console
    console.error('[analytics] ReportError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to generate the analytics report right now. Please try again shortly.' });
  }
});

export default router;
