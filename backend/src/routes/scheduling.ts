import { Router } from 'express';
import { z } from 'zod';
import { suggestBookingTimes, SchedulingModelError } from '../services/schedulingService';

const router = Router();

const suggestSchema = z
  .object({
    fieldId: z.string().min(1, 'fieldId is required'),
    preferredStartTime: z.string().datetime({ message: 'preferredStartTime must be a valid ISO datetime' }),
    preferredEndTime: z.string().datetime({ message: 'preferredEndTime must be a valid ISO datetime' }),
  })
  .refine((data) => new Date(data.preferredStartTime) < new Date(data.preferredEndTime), {
    message: 'preferredStartTime must be before preferredEndTime',
    path: ['preferredStartTime'],
  });

router.post('/suggestions', (req, res) => {
  const parsed = suggestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid scheduling request.', details: parsed.error.issues });
    return;
  }

  try {
    const { slots, rationale } = suggestBookingTimes(
      parsed.data.fieldId,
      parsed.data.preferredStartTime,
      parsed.data.preferredEndTime,
    );
    res.status(200).json({ slots, rationale });
  } catch (err) {
    if (err instanceof SchedulingModelError) {
      // Covers "Incorrect time suggestion" / "AI model failure" — the
      // model itself declined to reason about invalid input.
      res.status(400).json({ error: err.message });
      return;
    }
    // Covers "Integration error" — the call into the booking system
    // (checkForConflict) failed unexpectedly. Fail safe rather than
    // leaking internals or crashing the process.
    // eslint-disable-next-line no-console
    console.error('[scheduling] SchedulingSuggestionError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to suggest booking times right now. Please try again shortly.' });
  }
});

export default router;
