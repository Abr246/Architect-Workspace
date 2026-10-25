// naive/desk.js — a deliberately UNPROTECTED copy of the desk: timeout and
// retry only. No circuit breaker, no idempotency (runOnce), no quality
// gate — and, following from those, no fallback and no dead-letter either,
// since neither exists in a system that doesn't yet know it needs them.
//
// This is what most systems look like the first night they meet a bad
// vendor. Nothing here is malicious. It is just missing.
//
// Reuses vendor.js and reliability.js from the parent folder read-only —
// the protected desk at ../desk.js is never touched. Writes only to
// naive/data/, so the real sent.log / keys.json / breaker.json are
// untouched.

const fs = require("fs");
const path = require("path");
const vendor = require("../vendor");
const { withTimeout, retry } = require("../reliability");

const DATA_DIR = path.join(__dirname, "data");
const LOG_PATH = path.join(DATA_DIR, "sent.log");

const PER_ATTEMPT_TIMEOUT_MS = 2000;
const RETRY_ATTEMPTS = 20; // raised from the protected desk's 3, on purpose
const RETRY_BASE_DELAY_MS = 500;

class UpstreamUnavailable extends Error {
  constructor(message) {
    super(message);
    this.name = "UpstreamUnavailable";
  }
}

let vendorCallCount = 0;

async function callVendorOnce(orderId) {
  vendorCallCount += 1;
  try {
    return await vendor.getConfirmationMessage(orderId);
  } catch (err) {
    if (err.name === "TimeoutError") throw err;
    throw new UpstreamUnavailable(err.message);
  }
}

function logAttempt({ attempt, outcome, errorName }) {
  const suffix = outcome === "success" ? "success" : `failure (${errorName})`;
  console.log(`attempt ${attempt}: ${suffix}`);
}

// No breaker: retry is the ONLY thing standing between the caller and a
// vendor that is genuinely, sustainedly down. Nothing here notices "this
// has failed 3 times in a row, stop calling" — it just keeps trying, on a
// backoff that keeps doubling, all the way up to attempt 20.
async function getVendorMessage(orderId) {
  return retry(
    () => withTimeout(() => callVendorOnce(orderId), PER_ATTEMPT_TIMEOUT_MS),
    {
      attempts: RETRY_ATTEMPTS,
      baseDelayMs: RETRY_BASE_DELAY_MS,
      retryableErrorNames: new Set(["TimeoutError", "UpstreamUnavailable"]),
      onAttempt: logAttempt,
    }
  );
}

function appendSentLine(line) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(LOG_PATH, JSON.stringify(line) + "\n");
}

// No runOnce: nothing stops this running twice for the same order — two
// calls in means two lines out.
// No quality gate: whatever the vendor hands back gets sent, verbatim,
// good or garbage — there is nothing here that even looks at the content.
// No fallback, no dead-letter: if the vendor call ultimately fails after
// all 20 attempts, there is nothing here to catch it. It just throws, and
// the order leaves no trace anywhere.
async function confirm(orderId) {
  const message = await getVendorMessage(orderId);
  const sentAt = new Date().toISOString();
  const line = { orderId, message, sentAt };
  appendSentLine(line);
  return line;
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  if (command !== "confirm" || !arg) {
    console.error("Usage: node naive/desk.js confirm <orderId>");
    process.exitCode = 1;
    return;
  }

  try {
    const result = await confirm(arg);
    console.log(`Sent: ${result.message}`);
    console.log(`Sent at: ${result.sentAt}`);
  } catch (err) {
    console.error(`Order ${arg} FAILED — no fallback, no dead-letter, no trace: ${err.name}: ${err.message}`);
    process.exitCode = 1;
  } finally {
    console.log(`vendor calls made this run: ${vendorCallCount}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { confirm };
