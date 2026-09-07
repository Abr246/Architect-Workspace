import { Router } from 'express';
import { z } from 'zod';
import { answerQuestion } from '../services/assistantService';

const router = Router();

const askSchema = z.object({
  customerName: z.string().min(1, 'customerName is required'),
  question: z.string().min(1, 'question is required'),
});

router.post('/ask', (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid question request.', details: parsed.error.issues });
    return;
  }

  try {
    const { answer, understood } = answerQuestion(parsed.data.question, parsed.data.customerName);
    res.status(200).json({ answer, understood });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[assistant] AskError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to answer your question right now. Please try again shortly.' });
  }
});

export default router;
