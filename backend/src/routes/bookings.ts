import { Router } from 'express';
import { z } from 'zod';
import { createBooking, cancelBooking, BookingConflictError, BookingNotFoundError } from '../services/bookingsService';

const router = Router();

const createBookingSchema = z
  .object({
    fieldId: z.string().min(1, 'fieldId is required'),
    customerName: z.string().min(1, 'customerName is required'),
    startTime: z.string().datetime({ message: 'startTime must be a valid ISO datetime' }),
    endTime: z.string().datetime({ message: 'endTime must be a valid ISO datetime' }),
  })
  .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
    message: 'startTime must be before endTime',
    path: ['startTime'],
  });

const cancelBookingSchema = z.object({
  customerName: z.string().min(1, 'customerName is required'),
});

router.post('/', (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    // Covers this story's "Invalid time selection" failure path.
    res.status(400).json({ error: 'Invalid booking request.', details: parsed.error.issues });
    return;
  }

  try {
    const { booking, created } = createBooking(parsed.data);
    res.status(created ? 201 : 200).json({ booking });
  } catch (err) {
    if (err instanceof BookingConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }
    // Covers "Database write failure" — the service throws for any
    // unexpected reason, and the route fails safe rather than leaking
    // internals or crashing the process.
    // eslint-disable-next-line no-console
    console.error('[bookings] BookingCreateError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to create booking right now. Please try again shortly.' });
  }
});

router.post('/:id/cancel', (req, res) => {
  const parsed = cancelBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid cancellation request.', details: parsed.error.issues });
    return;
  }

  try {
    const { booking } = cancelBooking(req.params.id, parsed.data.customerName);
    res.status(200).json({ booking });
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('[bookings] BookingCancelError:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Unable to cancel this booking right now. Please try again shortly.' });
  }
});

export default router;
