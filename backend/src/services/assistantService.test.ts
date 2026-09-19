import { answerQuestion } from './assistantService';
import { listAuditEntries, resetAuditTrail } from './auditTrailService';
import { createBooking, resetBookings } from './bookingsService';
import * as analyticsService from './analyticsService';

describe('answerQuestion', () => {
  beforeEach(() => {
    resetAuditTrail();
  });

  it('answers a pricing question with real field prices', () => {
    const { answer, understood } = answerQuestion('How much does it cost?', 'Mia');

    expect(understood).toBe(true);
    expect(answer).toMatch(/Riverside Pitch: \$40\/hr/);
    expect(answer).toMatch(/Downtown Turf: \$55\/hr/);
  });

  it('answers an availability question with real field names', () => {
    const { answer, understood } = answerQuestion('Which fields are available?', 'Mia');

    expect(understood).toBe(true);
    expect(answer).toContain('Riverside Pitch');
    expect(answer).toContain('Downtown Turf');
  });

  it('does not combine pricing and availability just because the question mentions "book" ("AI provides an incorrect answer" prevention)', () => {
    const { answer } = answerQuestion('How much does it cost to book a field?', 'Mia');

    expect(answer).toMatch(/pricing/i);
    expect(answer).not.toMatch(/currently available/i);
  });

  it('combines pricing and availability when a question genuinely asks about both', () => {
    const { answer } = answerQuestion('What is available and how much does it cost?', 'Mia');

    expect(answer).toMatch(/currently available/i);
    expect(answer).toMatch(/pricing/i);
  });

  it('never fabricates a field that does not exist', () => {
    const { answer } = answerQuestion('How much does it cost?', 'Mia');

    expect(answer).not.toContain('Lakeside Field'); // unavailable field, correctly excluded
  });

  it('declines a question outside pricing/availability ("AI fails to understand the question")', () => {
    const { answer, understood } = answerQuestion('What is the weather like today?', 'Mia');

    expect(understood).toBe(false);
    expect(answer).toMatch(/not able to answer/i);
  });

  it('declines an empty question rather than guessing', () => {
    const { understood } = answerQuestion('   ', 'Mia');

    expect(understood).toBe(false);
  });
});

describe('answerQuestion — trends and complex queries (STORY-008)', () => {
  beforeEach(() => {
    resetAuditTrail();
    resetBookings();
    // STORY-010 added a bookingsVersion-keyed cache to
    // generateAnalyticsReport() — without this, a report cached by an
    // earlier test here could be silently reused by this one, since a
    // fresh resetBookings() also resets the version counter back to the
    // same value the earlier test cached against.
    analyticsService.resetAnalyticsCache();
  });

  it('honestly says there is no history yet when no bookings exist', () => {
    const { answer, understood } = answerQuestion('Which days are busy?', 'Mia');

    expect(understood).toBe(true);
    expect(answer).toMatch(/no.*trends|don't have enough booking history/i);
  });

  it('answers a trends question using real booking data', () => {
    createBooking({ fieldId: 'field-1', customerName: 'Alice', startTime: '2026-09-19T10:00:00.000Z', endTime: '2026-09-19T11:00:00.000Z' }); // Saturday

    const { answer, understood } = answerQuestion('Which days are usually busy?', 'Mia');

    expect(understood).toBe(true);
    expect(answer).toMatch(/Saturday/);
  });

  it('gives a detailed response combining pricing, availability, and trends for a genuinely complex query (acceptance criterion 1)', () => {
    createBooking({ fieldId: 'field-1', customerName: 'Alice', startTime: '2026-09-19T10:00:00.000Z', endTime: '2026-09-19T11:00:00.000Z' });

    const { answer, understood } = answerQuestion(
      'What is available, how much does it cost, and which days are popular?',
      'Mia',
    );

    expect(understood).toBe(true);
    expect(answer).toMatch(/currently available/i);
    expect(answer).toMatch(/pricing/i);
    expect(answer).toMatch(/Saturday/);
  });

  it('still gives a fallback response for a genuinely unsupported query (acceptance criterion 2, regression)', () => {
    const { answer, understood } = answerQuestion('What is your refund policy?', 'Mia');

    expect(understood).toBe(false);
    expect(answer).toMatch(/not able to answer/i);
  });

  it('degrades gracefully rather than losing the whole answer when trend analysis fails ("NLP processing error")', () => {
    jest.spyOn(analyticsService, 'generateAnalyticsReport').mockImplementation(() => {
      throw new Error('simulated analytics failure');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { answer, understood } = answerQuestion('How much does it cost and which days are busy?', 'Mia');

    expect(understood).toBe(true);
    expect(answer).toMatch(/pricing/i); // the part that didn't fail is still there
    expect(answer).toMatch(/problem analyzing booking trends/i);
    expect(errorSpy).toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('logs a complex-query interaction the same way as any other ("Trust" acceptance criterion)', () => {
    createBooking({ fieldId: 'field-1', customerName: 'Alice', startTime: '2026-09-19T10:00:00.000Z', endTime: '2026-09-19T11:00:00.000Z' });

    answerQuestion('What is available, how much does it cost, and which days are popular?', 'Mia');

    const entries = listAuditEntries().filter((e) => e.entityType === 'ai_interaction');
    expect(entries).toHaveLength(1);
    expect(entries[0].details).toMatchObject({ understood: true });
    expect((entries[0].details as { answer: string }).answer).toMatch(/Saturday/);
  });
});

describe('answerQuestion — audit logging', () => {
  beforeEach(() => {
    resetAuditTrail();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs the interaction with the question, answer, and a timestamp', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    answerQuestion('How much does it cost?', 'Mia');

    const logged = logSpy.mock.calls
      .map((call) => JSON.parse(call[0] as string))
      .find((entry) => entry.event === 'assistant_interaction');
    expect(logged).toBeDefined();
    expect(logged.context.question).toBe('How much does it cost?');
    expect(logged.timestamp).toEqual(expect.any(String));
  });

  it('records an audit entry for every interaction, including an unanswered one', () => {
    answerQuestion('How much does it cost?', 'Mia');
    answerQuestion('What is the weather?', 'Mia');

    const entries = listAuditEntries().filter((e) => e.entityType === 'ai_interaction');
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.action === 'answered')).toBe(true);
  });

  it('still returns a correct answer even if logging itself fails ("AI fails to log the interaction")', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('simulated logger crash');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { answer, understood } = answerQuestion('How much does it cost?', 'Mia');

    expect(understood).toBe(true);
    expect(answer).toMatch(/Riverside Pitch/);
    expect(errorSpy).toHaveBeenCalled();
  });
});
