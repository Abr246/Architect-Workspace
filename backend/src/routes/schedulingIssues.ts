import { Router } from 'express';
import { z } from 'zod';
import {
  listSchedulingIssues,
  resolveSchedulingIssue,
  SchedulingIssueNotFoundError,
  SchedulingIssueStatus,
} from '../services/schedulingIssuesService';

const router = Router();

const VALID_STATUSES: SchedulingIssueStatus[] = ['open', 'resolved'];

const resolveSchema = z.object({
  resolvedBy: z.string().min(1, 'resolvedBy is required'),
  notes: z.string().optional(),
});

// This is "the scheduler is notified" and "accessible for verification"
// made real — a scheduler (or a UI on their behalf) reads this to see
// what needs attention, same pattern as STORY-011's audit trail and
// STORY-004's pending-approvals list.
router.get('/', (req, res) => {
  const statusParam = req.query.status;
  if (statusParam !== undefined && !VALID_STATUSES.includes(statusParam as SchedulingIssueStatus)) {
    res.status(400).json({ error: 'Invalid status filter.', validValues: VALID_STATUSES });
    return;
  }

  const issues = listSchedulingIssues(statusParam as SchedulingIssueStatus | undefined);
  res.status(200).json({ issues });
});

router.post('/:id/resolve', (req, res) => {
  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid resolution request.', details: parsed.error.issues });
    return;
  }

  try {
    const { issue } = resolveSchedulingIssue(req.params.id, parsed.data.resolvedBy, parsed.data.notes);
    res.status(200).json({ issue });
  } catch (err) {
    if (err instanceof SchedulingIssueNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('[scheduling-issues] ResolveError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to resolve this issue right now. Please try again shortly.' });
  }
});

export default router;
