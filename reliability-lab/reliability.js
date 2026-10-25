// Generic reliability wrappers for any outside call: a per-attempt deadline,
// a capped jittered retry, and a circuit breaker around the whole retried
// operation. Domain-specific error classification (which failures are worth
// retrying, which trip the breaker) stays with the caller — this module only
// enforces the deadline, the retry/backoff mechanics, and the breaker state
// machine.

const fs = require("fs");
const path = require("path");

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "TimeoutError";
  }
}

// WHY: a call with no deadline is an outage that has not finished happening yet.
function withTimeout(fn, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`timed out after ${ms}ms`));
    }, ms);

    Promise.resolve()
      .then(() => fn())
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_RETRYABLE_ERROR_NAMES = new Set(["TimeoutError"]);

// WHY: the cap is the difference between a bad night and a bill. The growing
// gap and the jitter stop a thousand clients from retrying in the same second.
async function retry(fn, options = {}) {
  const {
    attempts = 3,
    baseDelayMs = 500,
    retryableErrorNames = DEFAULT_RETRYABLE_ERROR_NAMES,
    onAttempt,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await fn(attempt);
      if (onAttempt) onAttempt({ attempt, outcome: "success" });
      return result;
    } catch (err) {
      lastError = err;
      if (onAttempt) onAttempt({ attempt, outcome: "failure", errorName: err.name });

      const isLastAttempt = attempt === attempts;
      const isRetryable = retryableErrorNames.has(err.name);
      if (isLastAttempt || !isRetryable) throw err;

      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.random() * baseDelayMs;
      await wait(backoff + jitter);
    }
  }

  throw lastError;
}

class BreakerOpen extends Error {
  constructor(message) {
    super(message);
    this.name = "BreakerOpen";
  }
}

// WHY: sits AROUND retry, not inside it. Inside, every individual attempt
// would look like its own success/failure and a flaky-but-retried vendor
// would never trip the breaker at all — only the outcome of the whole
// retried operation should count. State is persisted to disk so the breaker
// remembers across separate process runs of the desk command.
class CircuitBreaker {
  constructor({ statePath, threshold = 3, cooldownMs = 10000 }) {
    this.statePath = statePath;
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.statePath, "utf8"));
    } catch {
      return { state: "closed", consecutiveFailures: 0, openedAt: null };
    }
  }

  _write(state) {
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
  }

  getState() {
    return this._read().state;
  }

  async exec(fn) {
    const state = this._read();
    const now = Date.now();

    if (state.state === "open") {
      const elapsed = now - state.openedAt;
      if (elapsed < this.cooldownMs) {
        const waitMs = this.cooldownMs - elapsed;
        throw new BreakerOpen(`circuit open — retry in ${Math.ceil(waitMs / 1000)}s`);
      }
      // Cooldown elapsed: this call is the single probe. Fall through to fn().
    }

    try {
      const result = await fn();
      this._write({ state: "closed", consecutiveFailures: 0, openedAt: null });
      return result;
    } catch (err) {
      // A probe call that fails re-opens the breaker on the spot — it does
      // not get to add up against a fresh count of 3.
      const consecutiveFailures =
        state.state === "open" ? state.consecutiveFailures : state.consecutiveFailures + 1;
      const nextState =
        consecutiveFailures >= this.threshold
          ? { state: "open", consecutiveFailures, openedAt: now }
          : { state: "closed", consecutiveFailures, openedAt: null };
      this._write(nextState);
      throw err;
    }
  }
}

const KEY_STORE_PATH = path.join(__dirname, "data", "keys.json");

function _readKeyStore() {
  try {
    return JSON.parse(fs.readFileSync(KEY_STORE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function _writeKeyStore(store) {
  fs.mkdirSync(path.dirname(KEY_STORE_PATH), { recursive: true });
  fs.writeFileSync(KEY_STORE_PATH, JSON.stringify(store, null, 2));
}

// WHY: the key is claimed BEFORE fn runs, not checked after. "Check after"
// leaves a gap where two arrivals both read "not sent yet" and both go on to
// send — claiming first closes that gap, because the second arrival finds
// the claim already there.
//
// The key must identify the ORDER, never the ATTEMPT — see callers for why.
// On success, the result is stored under the key and returned to every later
// caller unrun. On failure, the claim is released so a genuine retry (e.g.
// dead-letter replay) can still try again; only a completed send is ever
// remembered.
async function runOnce(key, fn) {
  const store = _readKeyStore();

  if (Object.prototype.hasOwnProperty.call(store, key)) {
    return { result: store[key].result, duplicate: true };
  }

  store[key] = { status: "in-progress", claimedAt: new Date().toISOString() };
  _writeKeyStore(store);

  try {
    const result = await fn();
    const settled = _readKeyStore();
    settled[key] = { status: "done", result, completedAt: new Date().toISOString() };
    _writeKeyStore(settled);
    return { result, duplicate: false };
  } catch (err) {
    const settled = _readKeyStore();
    delete settled[key];
    _writeKeyStore(settled);
    throw err;
  }
}

class QualityGateRejected extends Error {
  constructor(message, { score, reasons } = {}) {
    super(message);
    this.name = "QualityGateRejected";
    this.score = score;
    this.reasons = reasons;
  }
}

const QUALITY_GATE_THRESHOLD = 70;
const BANNED_PHRASES = ["as an ai", "i cannot", "i'm sorry", "as a language model"];

function escapeForRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole token, not a substring of a longer number or word: "order 4001"
// counts, "order 40010" or "id-4001x" does not.
function hasOrderIdToken(message, orderId) {
  if (typeof message !== "string") return false;
  const re = new RegExp(`(?<![0-9A-Za-z])${escapeForRegex(orderId)}(?![0-9A-Za-z])`);
  return re.test(message);
}

function hasNoBannedPhrase(message) {
  if (typeof message !== "string") return false;
  const lower = message.toLowerCase();
  return !BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}

function hasGoodLength(message) {
  return typeof message === "string" && message.length >= 20 && message.length <= 300;
}

// WHY: reliability gets the answer back; quality decides whether it's worth
// using. Getting a fast, well-formed, WRONG answer is not a connectivity
// problem, so it lives in its own layer instead of tangled into retry logic.
function score(message, orderId) {
  let total = 0;
  if (hasOrderIdToken(message, orderId)) total += 40;
  if (hasNoBannedPhrase(message)) total += 30;
  if (hasGoodLength(message)) total += 30;
  return total;
}

function scoreReasons(message, orderId) {
  const reasons = [];
  if (!hasOrderIdToken(message, orderId)) reasons.push("missing exact order id token (-40)");
  if (!hasNoBannedPhrase(message)) reasons.push("contains a banned phrase (-30)");
  if (!hasGoodLength(message)) {
    const len = typeof message === "string" ? message.length : 0;
    reasons.push(`length ${len} outside 20-300 characters (-30)`);
  }
  return reasons;
}

module.exports = {
  withTimeout,
  retry,
  TimeoutError,
  CircuitBreaker,
  BreakerOpen,
  runOnce,
  score,
  scoreReasons,
  QualityGateRejected,
  QUALITY_GATE_THRESHOLD,
};
