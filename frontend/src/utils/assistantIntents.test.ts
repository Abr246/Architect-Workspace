import { Booking } from '../services/bookingsApi';
import { Field } from '../services/fieldsApi';
import { SchedulingIssue } from '../services/schedulingIssuesApi';
import { formatHourLabel } from './timeSlots';
import {
  bookingsTodayAnswer,
  busiestTimesAnswer,
  customersAnswer,
  fieldsAvailableTodayAnswer,
  matchAssistantIntent,
  mostBookedFieldAnswer,
  schedulingConflictsAnswer,
  upcomingTodayAnswer,
} from './assistantIntents';

const fields: Field[] = [
  { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true, sizeFormat: '11v11', description: '', amenities: [] },
  { id: 'field-2', name: 'Downtown Turf', location: 'Central Complex', surfaceType: 'artificial turf', pricePerHour: 55, available: true, sizeFormat: '7v7', description: '', amenities: [] },
];

const now = new Date('2026-06-15T18:00:00.000Z');

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: 'booking-1',
    fieldId: 'field-1',
    customerName: 'John Smith',
    startTime: '2026-06-15T19:00:00.000Z',
    endTime: '2026-06-15T20:00:00.000Z',
    createdAt: '2026-06-10T00:00:00.000Z',
    status: 'confirmed',
    ...overrides,
  };
}

describe('matchAssistantIntent', () => {
  it.each([
    ['What fields are available today?', 'fields-available-today'],
    ['How many bookings do we have today?', 'bookings-today'],
    ['Are there any scheduling conflicts?', 'scheduling-conflicts'],
    ['Which field is booked the most?', 'most-booked-field'],
    ['What are the busiest booking times?', 'busiest-times'],
    ["Show me today's upcoming bookings.", 'upcoming-today'],
  ])('matches %s to %s', (question, expected) => {
    expect(matchAssistantIntent(question)).toBe(expected);
  });

  it('returns null for a question outside the known intents, so it can fall back to the backend assistant', () => {
    expect(matchAssistantIntent('How much does it cost?')).toBeNull();
    expect(matchAssistantIntent('')).toBeNull();
  });

  it('matches a customer-related question even though it was not one of the 6 suggestions', () => {
    expect(matchAssistantIntent('Who are our top customers?')).toBe('customers');
  });
});

describe('fieldsAvailableTodayAnswer', () => {
  it('lists fields with no active booking right now', () => {
    const bookings = [booking({ fieldId: 'field-1', startTime: '2026-06-15T17:00:00.000Z', endTime: '2026-06-15T19:00:00.000Z' })];
    expect(fieldsAvailableTodayAnswer(fields, bookings, now)).toBe('Available right now: Downtown Turf.');
  });

  it('says honestly that nothing is free when every field is currently booked', () => {
    const bookings = fields.map((f) =>
      booking({ id: `b-${f.id}`, fieldId: f.id, startTime: '2026-06-15T17:00:00.000Z', endTime: '2026-06-15T19:00:00.000Z' }),
    );
    expect(fieldsAvailableTodayAnswer(fields, bookings, now)).toMatch(/no fields are available right now/i);
  });
});

describe('bookingsTodayAnswer', () => {
  it('counts only confirmed bookings starting today', () => {
    const bookings = [
      booking({ startTime: '2026-06-15T19:00:00.000Z' }),
      booking({ id: 'b2', startTime: '2026-06-14T19:00:00.000Z' }), // yesterday
      booking({ id: 'b3', status: 'cancelled', startTime: '2026-06-15T20:00:00.000Z' }),
    ];
    expect(bookingsTodayAnswer(bookings, now)).toBe('There is 1 booking scheduled today.');
  });

  it('is honest when there are none', () => {
    expect(bookingsTodayAnswer([], now)).toBe('There are no bookings scheduled for today.');
  });
});

describe('schedulingConflictsAnswer', () => {
  const issue = (overrides: Partial<SchedulingIssue>): SchedulingIssue => ({
    id: 'issue-1',
    type: 'conflict',
    fieldId: 'field-1',
    details: {},
    status: 'open',
    detectedAt: now.toISOString(),
    notifiedAt: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    ...overrides,
  });

  it('names the affected fields when conflicts exist', () => {
    expect(schedulingConflictsAnswer([issue({})], fields)).toBe(
      'There is 1 scheduling conflict that needs attention: Riverside Pitch.',
    );
  });

  it('says everything looks clear when there are none', () => {
    expect(schedulingConflictsAnswer([], fields)).toBe('No scheduling conflicts right now — everything looks clear.');
  });
});

describe('mostBookedFieldAnswer', () => {
  it('names the field with the most confirmed bookings', () => {
    const bookings = [
      booking({ id: 'b1', fieldId: 'field-1' }),
      booking({ id: 'b2', fieldId: 'field-1' }),
      booking({ id: 'b3', fieldId: 'field-2' }),
    ];
    expect(mostBookedFieldAnswer(fields, bookings)).toBe('Riverside Pitch is booked the most, with 2 bookings.');
  });

  it('is honest about insufficient history', () => {
    expect(mostBookedFieldAnswer(fields, [])).toMatch(/don't have enough booking history/i);
  });
});

describe('busiestTimesAnswer', () => {
  it('reports the hour with the most bookings', () => {
    const bookings = [
      booking({ id: 'b1', startTime: '2026-06-15T19:00:00.000Z' }),
      booking({ id: 'b2', fieldId: 'field-2', startTime: '2026-06-16T19:00:00.000Z' }),
      booking({ id: 'b3', startTime: '2026-06-17T20:00:00.000Z' }),
    ];
    const sharedHour = new Date('2026-06-15T19:00:00.000Z').getHours();
    const answer = busiestTimesAnswer(bookings);

    expect(answer).toContain(formatHourLabel(sharedHour));
    expect(answer).toContain('2 bookings each');
  });

  it('is honest about insufficient history', () => {
    expect(busiestTimesAnswer([])).toMatch(/don't have enough booking history/i);
  });
});

describe('upcomingTodayAnswer', () => {
  it('lists only today\'s bookings that have not started yet', () => {
    const bookings = [
      booking({ id: 'past', startTime: '2026-06-15T10:00:00.000Z', endTime: '2026-06-15T11:00:00.000Z' }), // already passed
      booking({ id: 'future', startTime: '2026-06-15T20:00:00.000Z', endTime: '2026-06-15T21:00:00.000Z' }),
    ];
    const answer = upcomingTodayAnswer(bookings, fields, now);
    expect(answer).toContain('Riverside Pitch');
    expect(answer).toContain('John Smith');
    expect(answer).not.toContain('10:');
  });

  it('is honest when nothing is left today', () => {
    expect(upcomingTodayAnswer([], fields, now)).toBe('There are no more bookings coming up today.');
  });
});

describe('customersAnswer', () => {
  it('counts distinct customers and highlights the most frequent one', () => {
    const bookings = [
      booking({ id: 'b1', customerName: 'Alice' }),
      booking({ id: 'b2', customerName: 'Alice' }),
      booking({ id: 'b3', customerName: 'Bob' }),
    ];
    expect(customersAnswer(bookings)).toContain('2 different customers');
    expect(customersAnswer(bookings)).toContain('Alice');
  });

  it('is honest when there is no booking history', () => {
    expect(customersAnswer([])).toMatch(/don't have any customer booking history/i);
  });
});
