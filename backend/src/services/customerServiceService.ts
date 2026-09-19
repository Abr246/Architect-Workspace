import { answerQuestion } from './assistantService';
import { createEscalation, EscalationType } from './escalationsService';
import { recordAuditEntry } from './auditTrailService';

export type CustomerIssueStatus = 'resolved' | 'escalated' | 'failed';

export interface CustomerIssueResult {
  status: CustomerIssueStatus;
  message: string;
  escalationId: string | null;
}

// REQ-012 "detect customer requests": a refund or complaint is always a
// human matter (same rule STORY-004 already established) and is never even
// offered to the AI. Anything else is tried as a question first.
const REFUND_PATTERN = /refund/i;
const COMPLAINT_PATTERN = /complain|unhappy|disappointed|terrible|awful/i;

// Deterministic, rules-based triage — same honest-substitution stance as
// every other "AI" story in this build (STORY-003/006/007/008): no real
// NLP/LLM credentials exist here, so "detecting" a request is keyword
// matching, not a model call. This orchestrates two already-built services
// (assistantService, escalationsService) rather than rebuilding either.
export function handleCustomerIssue(customerName: string, issue: string): CustomerIssueResult {
  const trimmed = issue.trim();
  if (!trimmed) {
    return {
      status: 'failed',
      message: "I didn't catch an issue there — could you try describing it again?",
      escalationId: null,
    };
  }

  if (REFUND_PATTERN.test(trimmed)) {
    return escalate(customerName, trimmed, 'refund');
  }
  if (COMPLAINT_PATTERN.test(trimmed)) {
    return escalate(customerName, trimmed, 'complaint');
  }

  // REQ-015 "identify when an issue needs to be sent to a human": try the
  // AI first; anything it doesn't understand is escalated rather than left
  // as a dead-end decline — that's the actual difference from the plain
  // Assistant page (STORY-003/008), which stops at "I can't answer that."
  let aiAnswer: { answer: string; understood: boolean };
  try {
    aiAnswer = answerQuestion(trimmed, customerName);
  } catch (err) {
    // "AI handling error": a genuine fallback exists (escalate to a
    // human), so use it rather than losing the issue entirely.
    logFailure('ai_handling_error', customerName, trimmed, err);
    return escalate(customerName, trimmed, 'general');
  }

  if (aiAnswer.understood) {
    logOutcome('resolved', customerName, trimmed, aiAnswer.answer, null);
    return { status: 'resolved', message: aiAnswer.answer, escalationId: null };
  }

  return escalate(customerName, trimmed, 'general');
}

function escalate(
  customerName: string,
  trimmed: string,
  type: EscalationType,
): CustomerIssueResult {
  try {
    const { escalation } = createEscalation({ type, customerName, description: trimmed });
    const message = "Thanks — I've passed this to our team, and you'll be notified once it's reviewed.";
    logOutcome('escalated', customerName, trimmed, message, escalation.id);
    return { status: 'escalated', message, escalationId: escalation.id };
  } catch (err) {
    // "Escalation failure": this is the last fallback there is — no third
    // tier to degrade to, so fail honestly and log clearly rather than
    // fabricate a resolution or crash.
    logFailure('escalation_failure', customerName, trimmed, err);
    return {
      status: 'failed',
      message: "I'm having trouble reaching our team right now — please try again shortly or contact us directly.",
      escalationId: null,
    };
  }
}

function logOutcome(
  status: 'resolved' | 'escalated',
  customerName: string,
  issue: string,
  resolution: string,
  escalationId: string | null,
): void {
  const timestamp = new Date().toISOString();

  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp,
        level: 'info',
        service: 'backend',
        event: 'customer_issue_handled',
        outcome: 'success',
        context: { customerName, issue, status, resolution, escalationId },
      }),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[customer-service] OutcomeLoggingError:', err instanceof Error ? err.message : err);
  }

  try {
    recordAuditEntry({
      entityType: 'customer_issue',
      entityId: escalationId ?? `issue-${timestamp}-${customerName}`,
      action: status,
      actor: customerName,
      details: { issue, resolution, escalationId },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[customer-service] AuditTrailError:', err instanceof Error ? err.message : err);
  }
}

function logFailure(
  errorClass: 'ai_handling_error' | 'escalation_failure',
  customerName: string,
  issue: string,
  err: unknown,
): void {
  try {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'backend',
        event: 'customer_issue_processing_error',
        outcome: 'failure',
        error_class: errorClass,
        context: { customerName, issue, message: err instanceof Error ? err.message : String(err) },
      }),
    );
  } catch {
    // Logging must never crash the handling path either.
  }
}
