import { getAvailableFields } from './fieldsService';
import { recordAuditEntry } from './auditTrailService';

export interface AssistantAnswer {
  answer: string;
  understood: boolean;
}

// Deterministic, rules-based stand-in for "the AI assistant" — same
// honest-substitution pattern as STORY-006's scheduling engine and the
// Command Center's kbChat.js: no LLM/AI API credentials exist in this
// environment, and adding one is an external-dependency decision reserved
// for the user, not made unilaterally. Every answer is grounded in real
// field data (never fabricated), and REQ-004 scopes this explicitly to
// "pricing and availability" — anything else is honestly declined, which
// is exactly what acceptance criterion 2 asks for, not a shortcoming.
const PRICING_PATTERN = /price|cost|how much|\$/i;
// "availab" (not "available") deliberately matches both "available" and
// "availability" as one stem. "book" was deliberately left out — it's too
// generic a signal (it matches pricing questions like "how much to book a
// field?" too), and there's already a dedicated booking flow elsewhere in
// the app; the assistant's job here is answering, not booking.
const AVAILABILITY_PATTERN = /availab|free|open/i;

const OUT_OF_SCOPE_ANSWER =
  "I'm not able to answer that yet — I can help with questions about field pricing and availability.";

export function answerQuestion(question: string, customerName: string): AssistantAnswer {
  const trimmed = question.trim();
  const result = buildAnswer(trimmed);

  logInteraction(customerName, trimmed, result);

  return result;
}

function buildAnswer(question: string): AssistantAnswer {
  if (!question) {
    // "AI fails to understand the question" — an empty question is
    // honestly unanswerable, not guessed at.
    return { answer: "I didn't catch a question there — could you try asking again?", understood: false };
  }

  const asksPricing = PRICING_PATTERN.test(question);
  const asksAvailability = AVAILABILITY_PATTERN.test(question);

  if (asksPricing && asksAvailability) {
    return { answer: `${availabilityAnswer()} ${pricingAnswer()}`, understood: true };
  }
  if (asksPricing) {
    return { answer: pricingAnswer(), understood: true };
  }
  if (asksAvailability) {
    return { answer: availabilityAnswer(), understood: true };
  }

  // Outside the AI's known scope — acceptance criterion 2, not a bug.
  return { answer: OUT_OF_SCOPE_ANSWER, understood: false };
}

function pricingAnswer(): string {
  const fields = getAvailableFields();
  if (fields.length === 0) {
    return "I don't have any field pricing to share right now.";
  }
  const lines = fields.map((f) => `${f.name}: $${f.pricePerHour}/hr`);
  return `Here's our current pricing: ${lines.join(', ')}.`;
}

function availabilityAnswer(): string {
  const fields = getAvailableFields();
  if (fields.length === 0) {
    return 'No fields are available right now.';
  }
  return `Currently available: ${fields.map((f) => f.name).join(', ')}.`;
}

function logInteraction(customerName: string, question: string, result: AssistantAnswer): void {
  const timestamp = new Date().toISOString();

  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp,
        level: 'info',
        service: 'backend',
        event: 'assistant_interaction',
        outcome: 'success',
        context: { customerName, question, understood: result.understood, answer: result.answer },
      }),
    );
  } catch (err) {
    // "AI fails to log the interaction" must never prevent the customer
    // from receiving their answer — the answer has already been computed
    // by the time logging runs.
    // eslint-disable-next-line no-console
    console.error('[assistant] InteractionLoggingError:', err instanceof Error ? err.message : err);
  }

  try {
    recordAuditEntry({
      entityType: 'ai_interaction',
      entityId: `interaction-${timestamp}-${customerName}`,
      action: 'answered',
      actor: customerName,
      details: { question, answer: result.answer, understood: result.understood },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[assistant] AuditTrailError:', err instanceof Error ? err.message : err);
  }
}
