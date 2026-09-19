import { recordAuditEntry } from './auditTrailService';

// STORY-009 widens this to 'general' — a customer issue that isn't
// specifically a refund or complaint but that the AI still couldn't
// resolve on its own (see customerServiceService.ts). Same widen-not-
// rebuild pattern as auditTrailService's unions.
export type EscalationType = 'refund' | 'complaint' | 'general';
export type EscalationStatus = 'pending' | 'approved' | 'denied';

export interface Escalation {
  id: string;
  type: EscalationType;
  customerName: string;
  description: string;
  status: EscalationStatus;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNotes: string | null;
  // STORY-009 acceptance criterion 2: when the outcome was communicated
  // back to the customer. In-app record, same honest-substitution pattern
  // as STORY-012's scheduler notification — no real email/SMS channel
  // exists in this environment.
  customerNotifiedAt: string | null;
}

export interface CreateEscalationInput {
  type: EscalationType;
  customerName: string;
  description: string;
}

export type DecisionOutcome = 'approved' | 'denied';

export interface DecideEscalationInput {
  decidedBy: string;
  outcome: DecisionOutcome;
  notes?: string;
}

export class EscalationNotFoundError extends Error {
  constructor(id: string) {
    super(`No escalation found with id ${id}.`);
    this.name = 'EscalationNotFoundError';
  }
}

export class DecisionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionConflictError';
  }
}

// Walking skeleton: in-memory store, same pattern as fieldsService and
// bookingsService, until a real database lands in a later story.
let escalations: Escalation[] = [];
let nextId = 1;

export function createEscalation(input: CreateEscalationInput): { escalation: Escalation; created: boolean } {
  // Idempotent retry: an identical request for an escalation that's still
  // pending (undecided) returns the existing record rather than creating a
  // duplicate. Once something has been decided, an identical request is
  // treated as a genuinely new issue, not a retry of the old one.
  const existingPending = escalations.find(
    (e) =>
      e.status === 'pending' &&
      e.type === input.type &&
      e.customerName === input.customerName &&
      e.description === input.description,
  );

  if (existingPending) {
    return { escalation: existingPending, created: false };
  }

  const escalation: Escalation = {
    id: `escalation-${nextId++}`,
    type: input.type,
    customerName: input.customerName,
    description: input.description,
    status: 'pending',
    createdAt: new Date().toISOString(),
    decidedAt: null,
    decidedBy: null,
    decisionNotes: null,
    customerNotifiedAt: null,
  };
  escalations.push(escalation);

  // Every refund/complaint is, by this story's own requirement, an
  // "important decision" — so every real creation here is the escalation
  // to a human. Dedicated log line (on top of the generic requestLogger)
  // so this specific event is traceable with a timestamp, same pattern as
  // STORY-002's booking-created log.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      timestamp: escalation.createdAt,
      level: 'info',
      service: 'backend',
      event: 'escalation_created',
      outcome: 'success',
      context: {
        escalationId: escalation.id,
        type: escalation.type,
        customerName: escalation.customerName,
      },
    }),
  );

  return { escalation, created: true };
}

export function decideEscalation(id: string, input: DecideEscalationInput): { escalation: Escalation; decided: boolean } {
  const escalation = escalations.find((e) => e.id === id);
  if (!escalation) {
    throw new EscalationNotFoundError(id);
  }

  if (escalation.status !== 'pending') {
    const isSameDecision = escalation.status === input.outcome && escalation.decidedBy === input.decidedBy;

    if (isSameDecision) {
      // Idempotent retry: deciding the same way twice (e.g. a double-click
      // on "approve") must not re-process the refund/complaint a second
      // time — just hand back the existing, already-decided record.
      return { escalation, decided: false };
    }

    // A different outcome (or a different decider) than what's already on
    // record is a real conflict, not a harmless retry — refuse it rather
    // than silently overwriting a decision that's already been made.
    throw new DecisionConflictError(
      `Escalation ${id} was already ${escalation.status} by ${escalation.decidedBy}; cannot re-decide it as ${input.outcome}.`,
    );
  }

  escalation.status = input.outcome;
  escalation.decidedAt = new Date().toISOString();
  escalation.decidedBy = input.decidedBy;
  escalation.decisionNotes = input.notes ?? null;

  // The decision outcome, logged with a timestamp — this is the other half
  // of this story's Trust criterion (creation is already logged above).
  // STORY-009: wrapped in try/catch (it previously wasn't) — the decision
  // has already been recorded in memory by this point, so a logging
  // failure here must not crash the whole operation, same as every other
  // logging call in this codebase.
  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp: escalation.decidedAt,
        level: 'info',
        service: 'backend',
        event: 'escalation_decided',
        outcome: 'success',
        context: {
          escalationId: escalation.id,
          decision: escalation.status,
          decidedBy: escalation.decidedBy,
        },
      }),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[escalations] DecisionLoggingError:', err instanceof Error ? err.message : err);
  }

  notifyCustomerOfOutcome(escalation);

  return { escalation, decided: true };
}

// STORY-009 acceptance criterion 2: the customer must be informed once a
// human decides. A notification failure here must never undo or block the
// decision itself — it has already been recorded by the time this runs.
function notifyCustomerOfOutcome(escalation: Escalation): void {
  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp: escalation.decidedAt,
        level: 'info',
        service: 'backend',
        event: 'customer_notified_of_outcome',
        outcome: 'success',
        context: {
          escalationId: escalation.id,
          customerName: escalation.customerName,
          decision: escalation.status,
        },
      }),
    );
    escalation.customerNotifiedAt = escalation.decidedAt;
  } catch (err) {
    // "Customer notification failure" — the decision stands either way;
    // customerNotifiedAt simply stays null, which is honest, not silent.
    // eslint-disable-next-line no-console
    console.error('[escalations] CustomerNotificationError:', err instanceof Error ? err.message : err);
  }

  try {
    recordAuditEntry({
      entityType: 'customer_issue',
      entityId: escalation.id,
      action: 'resolved',
      actor: escalation.decidedBy ?? 'unknown',
      details: {
        decision: escalation.status,
        notes: escalation.decisionNotes,
        customerNotified: escalation.customerNotifiedAt !== null,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[escalations] AuditTrailError:', err instanceof Error ? err.message : err);
  }
}

export function listEscalations(status?: EscalationStatus): Escalation[] {
  if (!status) return [...escalations];
  return escalations.filter((e) => e.status === status);
}

// STORY-009: the customer-facing "check the outcome" lookup — a single
// record, not the staff-facing list above.
export function getEscalationById(id: string): Escalation {
  const escalation = escalations.find((e) => e.id === id);
  if (!escalation) {
    throw new EscalationNotFoundError(id);
  }
  return escalation;
}

// Test-only: reset the in-memory store between test cases.
export function resetEscalations(): void {
  escalations = [];
  nextId = 1;
}
