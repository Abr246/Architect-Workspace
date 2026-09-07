export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface SchedulingSuggestion {
  slots: TimeSlot[];
  rationale: string;
}

export async function fetchSuggestions(
  fieldId: string,
  preferredStartTime: string,
  preferredEndTime: string,
): Promise<SchedulingSuggestion | null> {
  // Suggestions are a helpful extra, not the point of booking — if the
  // call fails for any reason (a non-2xx response, or the network request
  // itself never completing — this story's "Integration error" on the
  // frontend side), the customer still has the original conflict message
  // and can just pick a different time manually. Never let this crash the
  // booking flow that's already in progress.
  try {
    const res = await fetch('/api/scheduling/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldId, preferredStartTime, preferredEndTime }),
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}
