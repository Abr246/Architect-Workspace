import { Router } from 'express';
import { z } from 'zod';
import {
  createEscalation,
  decideEscalation,
  listEscalations,
  EscalationNotFoundError,
  DecisionConflictError,
  EscalationStatus,
} from '../services/escalationsService';

const router = Router();

const createEscalationSchema = z.object({
  // The enum itself is the "Incorrect flagging" guard: anything that isn't
  // genuinely a refund or complaint request is rejected here rather than
  // silently escalated (or silently dropped).
  type: z.enum(['refund', 'complaint'], {
    errorMap: () => ({ message: 'type must be "refund" or "complaint"' }),
  }),
  customerName: z.string().min(1, 'customerName is required'),
  description: z.string().min(1, 'description is required'),
});

const decideEscalationSchema = z.object({
  decidedBy: z.string().min(1, 'decidedBy is required'),
  outcome: z.enum(['approved', 'denied'], {
    errorMap: () => ({ message: 'outcome must be "approved" or "denied"' }),
  }),
  notes: z.string().optional(),
});

const VALID_STATUSES: EscalationStatus[] = ['pending', 'approved', 'denied'];

router.get('/', (req, res) => {
  const statusParam = req.query.status;
  if (statusParam !== undefined && !VALID_STATUSES.includes(statusParam as EscalationStatus)) {
    res.status(400).json({ error: 'Invalid status filter.', validValues: VALID_STATUSES });
    return;
  }

  const escalations = listEscalations(statusParam as EscalationStatus | undefined);
  res.status(200).json({ escalations });
});

router.post('/', (req, res) => {
  const parsed = createEscalationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid escalation request.', details: parsed.error.issues });
    return;
  }

  try {
    const { escalation, created } = createEscalation(parsed.data);
    res.status(created ? 201 : 200).json({ escalation });
  } catch (err) {
    // Covers "Escalation failure" — the escalation itself couldn't be
    // recorded. Fail safe rather than leaking internals or crashing.
    // eslint-disable-next-line no-console
    console.error('[escalations] EscalationCreateError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to escalate this request right now. Please try again shortly.' });
  }
});

router.post('/:id/decision', (req, res) => {
  const parsed = decideEscalationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid decision request.', details: parsed.error.issues });
    return;
  }

  try {
    const { escalation } = decideEscalation(req.params.id, parsed.data);
    res.status(200).json({ escalation });
  } catch (err) {
    if (err instanceof EscalationNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof DecisionConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }
    // Covers "Approval interface error" — the decision itself couldn't be
    // recorded. Fail safe rather than leaking internals or crashing.
    // eslint-disable-next-line no-console
    console.error('[escalations] DecisionError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to record this decision right now. Please try again shortly.' });
  }
});

export default router;
