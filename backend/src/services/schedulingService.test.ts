import { suggestBookingTimes, SchedulingModelError } from './schedulingService';
import { createBooking, resetBookings } from './bookingsService';
import * as bookingsService from './bookingsService';

const fieldId = 'field-1';
const preferredStart = '2026-09-20T10:00:00.000Z';
const preferredEnd = '2026-09-20T11:00:00.000Z';

describe('suggestBookingTimes', () => {
  beforeEach(() => {
    resetBookings();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('presents the preferred time itself when it is available', () => {
    const { slots, rationale } = suggestBookingTimes(fieldId, preferredStart, preferredEnd);

    expect(slots).toEqual([{ startTime: preferredStart, endTime: preferredEnd }]);
    expect(rationale).toMatch(/available/i);
  });

  it('suggests alternative times when the preferred window is busy', () => {
    createBooking({ fieldId, customerName: 'Jack', startTime: preferredStart, endTime: preferredEnd });

    const { slots, rationale } = suggestBookingTimes(fieldId, preferredStart, preferredEnd);

    expect(slots.length).toBeGreaterThan(0);
    expect(rationale).toMatch(/already booked/i);
  });

  it('never suggests a slot that actually overlaps an existing booking ("Incorrect time suggestion")', () => {
    createBooking({ fieldId, customerName: 'Jack', startTime: preferredStart, endTime: preferredEnd });

    const { slots } = suggestBookingTimes(fieldId, preferredStart, preferredEnd);

    for (const slot of slots) {
      expect(slot.startTime === preferredStart && slot.endTime === preferredEnd).toBe(false);
    }
  });

  it('throws SchedulingModelError for an invalid preferred window ("AI model failure")', () => {
    expect(() => suggestBookingTimes(fieldId, preferredEnd, preferredStart)).toThrow(SchedulingModelError);
  });

  it('propagates a failure from the booking system rather than swallowing it ("Integration error")', () => {
    jest.spyOn(bookingsService, 'checkForConflict').mockImplementation(() => {
      throw new Error('simulated booking-system failure');
    });

    expect(() => suggestBookingTimes(fieldId, preferredStart, preferredEnd)).toThrow('simulated booking-system failure');
  });
});

describe('suggestBookingTimes — audit logging', () => {
  beforeEach(() => {
    resetBookings();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs the suggestion with a rationale and a timestamp', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    suggestBookingTimes(fieldId, preferredStart, preferredEnd);

    const logged = logSpy.mock.calls
      .map((call) => JSON.parse(call[0] as string))
      .find((entry) => entry.event === 'scheduling_suggestion');

    expect(logged).toBeDefined();
    expect(logged.context.rationale).toEqual(expect.any(String));
    expect(logged.timestamp).toEqual(expect.any(String));
    expect(new Date(logged.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('still returns a correct suggestion even if logging itself fails', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('simulated logger crash');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { slots } = suggestBookingTimes(fieldId, preferredStart, preferredEnd);

    expect(slots).toEqual([{ startTime: preferredStart, endTime: preferredEnd }]);
    expect(errorSpy).toHaveBeenCalled();
  });
});
