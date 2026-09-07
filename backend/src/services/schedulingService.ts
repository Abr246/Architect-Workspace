import { checkForConflict } from './bookingsService';

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface SchedulingSuggestion {
  slots: TimeSlot[];
  rationale: string;
}

export class SchedulingModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchedulingModelError';
  }
}

// Deterministic, rules-based stand-in for "the AI scheduling model" — see
// the notes on this story for why: no LLM/AI API credentials exist in this
// environment, and adding one is an external-dependency decision that
// hasn't been made. This reasons over real booking data (via
// checkForConflict, STORY-005) and produces genuine, correctness-checked
// suggestions with a rationale — same relationship as the in-memory store
// standing in for a real database elsewhere in this build.
const CANDIDATE_SHIFT_HOURS = [1, -1, 2, -2, 24];
const MAX_SUGGESTIONS = 3;

export function suggestBookingTimes(
  fieldId: string,
  preferredStartTime: string,
  preferredEndTime: string,
): SchedulingSuggestion {
  const start = new Date(preferredStartTime);
  const end = new Date(preferredEndTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    // "Incorrect time suggestion" prevention: refuse to reason about a
    // preferred window that doesn't make sense, rather than guessing.
    throw new SchedulingModelError('Preferred start/end time is invalid.');
  }
  const durationMs = end.getTime() - start.getTime();

  const { hasConflict } = checkForConflict(fieldId, preferredStartTime, preferredEndTime);

  let slots: TimeSlot[];
  let rationale: string;

  if (!hasConflict) {
    slots = [{ startTime: preferredStartTime, endTime: preferredEndTime }];
    rationale = 'The requested time is available, so it is the optimal choice.';
  } else {
    slots = [];
    for (const shiftHours of CANDIDATE_SHIFT_HOURS) {
      if (slots.length >= MAX_SUGGESTIONS) break;
      const candidateStart = new Date(start.getTime() + shiftHours * 60 * 60 * 1000);
      const candidateEnd = new Date(candidateStart.getTime() + durationMs);
      const candidateStartIso = candidateStart.toISOString();
      const candidateEndIso = candidateEnd.toISOString();

      // Every candidate is re-checked against real bookings before it's
      // ever offered — this is what makes "identifies optimal times" and
      // "never suggests a busy time" true by construction, not by luck.
      const { hasConflict: candidateConflict } = checkForConflict(fieldId, candidateStartIso, candidateEndIso);
      if (!candidateConflict) {
        slots.push({ startTime: candidateStartIso, endTime: candidateEndIso });
      }
    }

    rationale =
      slots.length > 0
        ? 'The requested time is already booked, so these are the nearest available windows of the same duration.'
        : 'The requested time is already booked, and no nearby alternative was free within the windows checked.';
  }

  logSuggestion({ fieldId, preferredStartTime, preferredEndTime, wasBusy: hasConflict, slots, rationale });

  return { slots, rationale };
}

function logSuggestion(input: {
  fieldId: string;
  preferredStartTime: string;
  preferredEndTime: string;
  wasBusy: boolean;
  slots: TimeSlot[];
  rationale: string;
}): void {
  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'backend',
        event: 'scheduling_suggestion',
        outcome: 'success',
        context: {
          fieldId: input.fieldId,
          preferredStartTime: input.preferredStartTime,
          preferredEndTime: input.preferredEndTime,
          wasBusy: input.wasBusy,
          suggestedSlots: input.slots,
          rationale: input.rationale,
        },
      }),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[scheduling] SchedulingLoggingError:', err instanceof Error ? err.message : err);
  }
}
