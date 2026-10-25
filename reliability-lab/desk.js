// Order desk commands:
//   confirm <orderId>  — ask the vendor, then "send" by appending one JSON
//                        line to data/sent.log (or a fallback line if the
//                        vendor is unavailable / the breaker is open).
//   replay             — re-run every dead-lettered order through the same
//                        path and drop the ones that now succeed.
//
// That append is the side effect a customer would notice — everything this
// week is about protecting that one line, and about never losing an order
// that couldn't get one, and about knowing — cheaply — whether it was worth
// sending at all.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vendor = require("./vendor");
const {
  withTimeout,
  retry,
  CircuitBreaker,
  runOnce,
  score,
  scoreReasons,
  QualityGateRejected,
  QUALITY_GATE_THRESHOLD,
} = require("./reliability");

const DATA_DIR = path.join(__dirname, "data");
const LOG_PATH = path.join(DATA_DIR, "sent.log");
const BREAKER_PATH = path.join(DATA_DIR, "breaker.json");
const DEAD_LETTER_PATH = path.join(DATA_DIR, "dead-letter.jsonl");

const PER_ATTEMPT_TIMEOUT_MS = 2000;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 10000;

const breaker = new CircuitBreaker({
  statePath: BREAKER_PATH,
  threshold: BREAKER_THRESHOLD,
  cooldownMs: BREAKER_COOLDOWN_MS,
});

// The only vendor failure left to classify here is connectivity — content
// quality is the gate's job now, not this layer's. See sendConfirmationOnce.
class UpstreamUnavailable extends Error {
  constructor(message) {
    super(message);
    this.name = "UpstreamUnavailable";
  }
}

async function callVendorOnce(orderId) {
  try {
    return await vendor.getConfirmationMessage(orderId);
  } catch (err) {
    if (err.name === "TimeoutError") throw err;
    throw new UpstreamUnavailable(err.message);
  }
}

function logAttempt(correlationId, { attempt, outcome, errorName }) {
  const suffix = outcome === "success" ? "success" : `failure (${errorName})`;
  console.log(`[${correlationId}] attempt ${attempt}: ${suffix}`);
}

// Breaker AROUND retry: the breaker only ever sees the outcome of the whole
// retried operation, never an individual attempt. That is what lets a vendor
// that is merely flaky (retries succeed) stay closed, while a vendor that is
// genuinely down (retries exhausted, 3 times over) trips it.
async function getVendorMessage(orderId, correlationId, attemptCounter) {
  return breaker.exec(() =>
    retry(
      () => withTimeout(() => callVendorOnce(orderId), PER_ATTEMPT_TIMEOUT_MS),
      {
        attempts: RETRY_ATTEMPTS,
        baseDelayMs: RETRY_BASE_DELAY_MS,
        retryableErrorNames: new Set(["TimeoutError", "UpstreamUnavailable"]),
        onAttempt: (info) => {
          attemptCounter.count += 1;
          logAttempt(correlationId, info);
        },
      }
    )
  );
}

function fallbackMessage(orderId) {
  return `Your order ${orderId} is confirmed. Full details will follow shortly.`;
}

function appendSentLine(line) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(LOG_PATH, JSON.stringify(line) + "\n");
}

function readDeadLetter() {
  if (!fs.existsSync(DEAD_LETTER_PATH)) return [];
  return fs
    .readFileSync(DEAD_LETTER_PATH, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function writeDeadLetter(entries) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const body = entries.map((entry) => JSON.stringify(entry)).join("\n");
  fs.writeFileSync(DEAD_LETTER_PATH, entries.length > 0 ? body + "\n" : "");
}

function appendDeadLetter(orderId, errorName, correlationId, extra = {}) {
  const entries = readDeadLetter();
  entries.push({ orderId, errorName, at: new Date().toISOString(), correlationId, ...extra });
  writeDeadLetter(entries);
}

// The one place that decides fallback vs. dead-letter, and the one place the
// quality gate runs. Reliability (breaker/retry, above) only gets an answer
// back — this is where we decide whether that answer, or the fallback
// template standing in for it, is worth using at all.
//
// The gate runs on BOTH: the vendor's own message (fallback === false below)
// and the fallback template (fallback === true). A message that fails the
// gate is never sent under any name — there is no fallback-from-a-fallback,
// it goes straight to dead-letter.
async function sendConfirmationOnce(orderId, correlationId, attemptCounter) {
  let message;
  let fallback = false;

  try {
    message = await getVendorMessage(orderId, correlationId, attemptCounter);
  } catch (err) {
    console.log(`[${correlationId}] order ${orderId}: ${err.name} — sending fallback`);
    message = fallbackMessage(orderId);
    fallback = true;
  }

  const gateScore = score(message, orderId);
  if (gateScore < QUALITY_GATE_THRESHOLD) {
    const reasons = scoreReasons(message, orderId);
    console.log(
      `[${correlationId}] order ${orderId}: QualityGateRejected (score ${gateScore}/100) — ${reasons.join("; ")}`
    );
    throw new QualityGateRejected(
      `score ${gateScore} below threshold ${QUALITY_GATE_THRESHOLD}: ${reasons.join("; ")}`,
      { score: gateScore, reasons }
    );
  }

  const sentAt = new Date().toISOString();
  const line = {
    orderId,
    correlationId,
    message,
    sentAt,
    gateScore,
    ...(fallback ? { fallback: true } : {}),
  };
  appendSentLine(line);

  return { orderId, message, sentAt, fallback, gateScore };
}

// Idempotency key comes from the ORDER, never the attempt: "order:<orderId>".
// A fresh random ID minted at the top of each run would make this whole
// protection worthless — every arrival would look brand new to runOnce, so
// two arrivals for the same order would just get two different keys and both
// would send.
//
// A duplicate (a stored result) is returned here BEFORE the gate ever runs —
// runOnce short-circuits and sendConfirmationOnce, where the gate lives, is
// never called a second time. A stored result was already gated once.
async function sendConfirmation(orderId, correlationId, attemptCounter) {
  const { result, duplicate } = await runOnce(`order:${orderId}`, () =>
    sendConfirmationOnce(orderId, correlationId, attemptCounter)
  );
  return { ...result, duplicate };
}

function randomCorrelationId() {
  return crypto.randomUUID();
}

// One correlation id per confirm RUN (not per order — that's the idempotency
// key's job). Follows the order through every log line, the sent.log line,
// and the dead-letter row, so a 2 AM incident is one grep away.
async function confirmCommand(orderId) {
  const correlationId = randomCorrelationId();
  const attemptCounter = { count: 0 };

  let outcome;
  let errorName = null;
  let gateScore = null;

  try {
    const result = await sendConfirmation(orderId, correlationId, attemptCounter);
    gateScore = result.gateScore ?? null;
    outcome = result.duplicate ? "duplicate" : result.fallback ? "fallback" : "sent";

    console.log(
      `[${correlationId}] ${result.fallback ? "Fallback sent" : "Vendor message"}: ${result.message}`
    );
    console.log(`[${correlationId}] Sent at: ${result.sentAt}`);
    if (result.duplicate) {
      console.log(`[${correlationId}] duplicate: true (order ${orderId} was already sent — nothing sent again)`);
    }
  } catch (err) {
    outcome = "dead-lettered";
    errorName = err.name;
    gateScore = typeof err.score === "number" ? err.score : null;
    appendDeadLetter(orderId, err.name, correlationId, {
      ...(gateScore !== null ? { score: gateScore } : {}),
      ...(err.reasons ? { reasons: err.reasons } : {}),
    });
    console.error(`[${correlationId}] Order ${orderId} could not be sent: ${err.name}: ${err.message}`);
    console.error(`[${correlationId}] Dead-lettered order ${orderId} (${err.name}).`);
    process.exitCode = 1;
  }

  const receipt = {
    orderId,
    correlationId,
    attempts: attemptCounter.count,
    breakerState: breaker.getState(),
    gateScore,
    outcome,
    errorName,
  };
  console.log(`[${correlationId}] receipt: ${JSON.stringify(receipt)}`);
}

async function replayCommand() {
  const entries = readDeadLetter();
  if (entries.length === 0) {
    console.log("Dead-letter is empty — nothing to replay.");
    return;
  }

  const stillFailing = [];
  for (const entry of entries) {
    const correlationId = randomCorrelationId();
    const attemptCounter = { count: 0 };
    try {
      const result = await sendConfirmation(entry.orderId, correlationId, attemptCounter);
      const label = result.duplicate ? "already sent (duplicate: true)" : result.fallback ? "sent (fallback)" : "sent";
      console.log(`[${correlationId}] replay ${entry.orderId}: ${label} — removed from dead-letter`);
    } catch (err) {
      console.log(`[${correlationId}] replay ${entry.orderId}: still failing (${err.name}) — kept in dead-letter`);
      stillFailing.push({
        orderId: entry.orderId,
        errorName: err.name,
        at: new Date().toISOString(),
        correlationId,
        ...(typeof err.score === "number" ? { score: err.score } : {}),
        ...(err.reasons ? { reasons: err.reasons } : {}),
      });
    }
  }

  writeDeadLetter(stillFailing);
}

async function main() {
  const [command, arg] = process.argv.slice(2);

  if (command === "confirm" && arg) {
    await confirmCommand(arg);
    return;
  }

  if (command === "replay") {
    await replayCommand();
    return;
  }

  console.error("Usage: node desk.js confirm <orderId>");
  console.error("       node desk.js replay");
  process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = { confirm: sendConfirmation, replay: replayCommand };
