import {
  createEscalation,
  decideEscalation,
  resetEscalations,
  EscalationNotFoundError,
  DecisionConflictError,
} from './escalationsService';

const refundInput = {
  type: 'refund' as const,
  customerName: 'Alice',
  description: 'Field was closed for maintenance during my booking',
};

describe('createEscalation', () => {
  beforeEach(() => {
    resetEscalations();
  });

  it('creates a new refund escalation, pending by default', () => {
    const { escalation, created } = createEscalation(refundInput);

    expect(created).toBe(true);
    expect(escalation.type).toBe('refund');
    expect(escalation.status).toBe('pending');
    expect(escalation.id).toEqual(expect.any(String));
    expect(escalation.createdAt).toEqual(expect.any(String));
    expect(escalation.decidedAt).toBeNull();
  });

  it('creates a new complaint escalation', () => {
    const { escalation, created } = createEscalation({
      type: 'complaint',
      customerName: 'Bob',
      description: 'Staff was rude at check-in',
    });

    expect(created).toBe(true);
    expect(escalation.type).toBe('complaint');
  });

  it('returns the same escalation on an identical retry while still pending', () => {
    const first = createEscalation(refundInput);
    const second = createEscalation(refundInput);

    expect(second.created).toBe(false);
    expect(second.escalation.id).toBe(first.escalation.id);
  });

  it('treats different descriptions from the same customer as separate escalations', () => {
    createEscalation(refundInput);

    const { created } = createEscalation({
      ...refundInput,
      description: 'A different issue entirely',
    });

    expect(created).toBe(true);
  });
});

describe('createEscalation — audit logging', () => {
  beforeEach(() => {
    resetEscalations();
  });

  it('logs the escalation type and customer, with a timestamp, on real creation', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    createEscalation(refundInput);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(logged.event).toBe('escalation_created');
    expect(logged.context.type).toBe('refund');
    expect(logged.context.customerName).toBe('Alice');
    expect(logged.timestamp).toEqual(expect.any(String));
    expect(new Date(logged.timestamp).toString()).not.toBe('Invalid Date');

    logSpy.mockRestore();
  });

  it('does not log again on an idempotent retry', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    createEscalation(refundInput);
    createEscalation(refundInput);

    expect(logSpy).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
  });
});

describe('decideEscalation', () => {
  beforeEach(() => {
    resetEscalations();
  });

  it('approves a pending escalation', () => {
    const { escalation } = createEscalation(refundInput);

    const { escalation: decided, decided: wasDecided } = decideEscalation(escalation.id, {
      decidedBy: 'Manager Mo',
      outcome: 'approved',
      notes: 'Confirmed in payment logs',
    });

    expect(wasDecided).toBe(true);
    expect(decided.status).toBe('approved');
    expect(decided.decidedBy).toBe('Manager Mo');
    expect(decided.decisionNotes).toBe('Confirmed in payment logs');
    expect(decided.decidedAt).toEqual(expect.any(String));
  });

  it('denies a pending escalation', () => {
    const { escalation } = createEscalation(refundInput);

    const { escalation: decided } = decideEscalation(escalation.id, {
      decidedBy: 'Manager Mo',
      outcome: 'denied',
    });

    expect(decided.status).toBe('denied');
  });

  it('throws EscalationNotFoundError for an id that does not exist', () => {
    expect(() => decideEscalation('escalation-999', { decidedBy: 'Manager Mo', outcome: 'approved' })).toThrow(
      EscalationNotFoundError,
    );
  });

  it('returns the same decided record on an identical decision retry, without re-processing', () => {
    const { escalation } = createEscalation(refundInput);
    decideEscalation(escalation.id, { decidedBy: 'Manager Mo', outcome: 'approved' });

    const first = decideEscalation(escalation.id, { decidedBy: 'Manager Mo', outcome: 'approved' });

    expect(first.decided).toBe(false);
  });

  it('rejects a conflicting decision on an already-decided escalation', () => {
    const { escalation } = createEscalation(refundInput);
    decideEscalation(escalation.id, { decidedBy: 'Manager Mo', outcome: 'approved' });

    expect(() => decideEscalation(escalation.id, { decidedBy: 'Manager Mo', outcome: 'denied' })).toThrow(
      DecisionConflictError,
    );
  });

  it('rejects a same-outcome decision from a different decider as a conflict, not an idempotent retry', () => {
    const { escalation } = createEscalation(refundInput);
    decideEscalation(escalation.id, { decidedBy: 'Manager Mo', outcome: 'approved' });

    expect(() => decideEscalation(escalation.id, { decidedBy: 'Someone Else', outcome: 'approved' })).toThrow(
      DecisionConflictError,
    );
  });
});

describe('decideEscalation — audit logging', () => {
  beforeEach(() => {
    resetEscalations();
  });

  afterEach(() => {
    // A manual logSpy.mockRestore() at the end of a test body never runs
    // when an assertion fails partway through, leaking the spy's call
    // history into the next test (the STORY-005 lesson) — this is the
    // fix, applied here too.
    jest.restoreAllMocks();
  });

  it('logs the decision outcome and decider, with a timestamp, on a real decision', () => {
    const { escalation } = createEscalation(refundInput);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    decideEscalation(escalation.id, { decidedBy: 'Manager Mo', outcome: 'approved' });

    // STORY-009 adds a second log line (the customer notification) —
    // filter by event name rather than assume exact call counts/order.
    const logged = logSpy.mock.calls
      .map((call) => JSON.parse(call[0] as string))
      .find((entry) => entry.event === 'escalation_decided');
    expect(logged).toBeDefined();
    expect(logged.context.decision).toBe('approved');
    expect(logged.context.decidedBy).toBe('Manager Mo');
    expect(logged.timestamp).toEqual(expect.any(String));
  });

  it('does not log again on an idempotent decision retry', () => {
    const { escalation } = createEscalation(refundInput);
    decideEscalation(escalation.id, { decidedBy: 'Manager Mo', outcome: 'approved' });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    decideEscalation(escalation.id, { decidedBy: 'Manager Mo', outcome: 'approved' });

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('informs the customer of the outcome when a human decides (STORY-009 acceptance criterion 2)', () => {
    const { escalation: created } = createEscalation(refundInput);

    const { escalation } = decideEscalation(created.id, { decidedBy: 'Manager Mo', outcome: 'approved' });

    expect(escalation.customerNotifiedAt).toEqual(expect.any(String));
  });

  it('still records the decision even if notifying the customer fails ("Customer notification failure")', () => {
    const { escalation: created } = createEscalation(refundInput);
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('simulated notification failure');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { escalation, decided } = decideEscalation(created.id, { decidedBy: 'Manager Mo', outcome: 'approved' });

    expect(decided).toBe(true);
    expect(escalation.status).toBe('approved');
    expect(escalation.customerNotifiedAt).toBeNull(); // honest, not silently faked
    expect(errorSpy).toHaveBeenCalled();
  });
});
