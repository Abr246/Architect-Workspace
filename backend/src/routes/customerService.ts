import { Router } from 'express';
import { z } from 'zod';
import { handleCustomerIssue } from '../services/customerServiceService';
import { getEscalationById, EscalationNotFoundError } from '../services/escalationsService';

const router = Router();

const submitIssueSchema = z.object({
  customerName: z.string().min(1, 'customerName is required'),
  issue: z.string().min(1, 'issue is required'),
});

router.post('/issues', (req, res) => {
  const parsed = submitIssueSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid issue request.', details: parsed.error.issues });
    return;
  }

  try {
    const result = handleCustomerIssue(parsed.data.customerName, parsed.data.issue);
    // 200 regardless of resolved/escalated/failed — the request itself was
    // processed; the outcome is carried in the body, same pattern as the
    // Assistant endpoint's understood: false.
    res.status(200).json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[customer-service] IssueHandlingError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to process your issue right now. Please try again shortly.' });
  }
});

router.get('/issues/:escalationId', (req, res) => {
  try {
    const escalation = getEscalationById(req.params.escalationId);
    res.status(200).json({ escalation });
  } catch (err) {
    if (err instanceof EscalationNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('[customer-service] IssueStatusError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to check this issue right now. Please try again shortly.' });
  }
});

export default router;
