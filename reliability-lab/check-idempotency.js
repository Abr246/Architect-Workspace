// Proves the desk's send is idempotent: calling confirm twice for the same
// order appends exactly ONE line to data/sent.log, and the second call
// reports duplicate: true instead of sending again.
//
// Plain script, no test framework, no dependencies. Exits 0 on pass, 1 on
// failure. Named check-idempotency.js (not test-*/​*_test) on purpose, so
// nothing in this project's own tooling mistakes it for something else.
//
// Run: node check-idempotency.js   (or: npm test)

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DIR = __dirname;
const DATA_DIR = path.join(DIR, "data");
const SENT_LOG = path.join(DATA_DIR, "sent.log");
const KEY_STORE = path.join(DATA_DIR, "keys.json");
const BREAKER = path.join(DATA_DIR, "breaker.json");

const ORDER_ID = "4001";

function countLinesForOrder(orderId) {
  if (!fs.existsSync(SENT_LOG)) return 0;
  return fs
    .readFileSync(SENT_LOG, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .filter((line) => JSON.parse(line).orderId === orderId).length;
}

function runConfirm(orderId) {
  return execFileSync("node", ["desk.js", "confirm", orderId], {
    cwd: DIR,
    env: { ...process.env, VENDOR_MODE: "ok" },
    encoding: "utf8",
  });
}

// Fresh, deterministic starting state for this order: no leftover claim, no
// leftover breaker trip, no leftover sent.log lines for THIS order (other
// orders' lines are left alone).
fs.mkdirSync(DATA_DIR, { recursive: true });
for (const p of [KEY_STORE, BREAKER]) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
if (fs.existsSync(SENT_LOG)) {
  const keep = fs
    .readFileSync(SENT_LOG, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .filter((line) => JSON.parse(line).orderId !== ORDER_ID);
  fs.writeFileSync(SENT_LOG, keep.length ? keep.join("\n") + "\n" : "");
}

const failures = [];

console.log(`--- run 1: confirm ${ORDER_ID} ---`);
const firstOutput = runConfirm(ORDER_ID);
process.stdout.write(firstOutput);

const afterFirst = countLinesForOrder(ORDER_ID);
if (afterFirst !== 1) {
  failures.push(`expected exactly 1 line for order ${ORDER_ID} after run 1, found ${afterFirst}`);
}
if (/duplicate: true/.test(firstOutput)) {
  failures.push("run 1 must not report duplicate: true — it is the original send");
}

console.log(`--- run 2: confirm ${ORDER_ID} ---`);
const secondOutput = runConfirm(ORDER_ID);
process.stdout.write(secondOutput);

const afterSecond = countLinesForOrder(ORDER_ID);
if (afterSecond !== 1) {
  failures.push(`expected sent.log to still have exactly 1 line for order ${ORDER_ID} after run 2, found ${afterSecond}`);
}
if (!/duplicate: true/.test(secondOutput)) {
  failures.push("run 2 must report duplicate: true");
}

if (failures.length > 0) {
  console.error("\ncheck-idempotency: FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `\ncheck-idempotency: PASS — order ${ORDER_ID} sent exactly once across 2 confirm calls, run 2 reported duplicate: true`
);
