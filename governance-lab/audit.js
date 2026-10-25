'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUDIT_PATH = path.join(__dirname, 'data', 'audit.jsonl');

// Fixed genesis value for the first entry's prevHash — there is no real
// predecessor, so the chain anchors on a value nobody can "find" by hashing
// real content, the same way a blockchain's block zero does.
const GENESIS_HASH = '0'.repeat(64);

// Deterministic serialization: object keys sorted recursively, so the same
// logical entry always produces the same bytes to hash regardless of the
// order its fields were constructed in. Without this, two in-memory objects
// with identical data but different key insertion order would hash
// differently, and the chain would "break" on nothing.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function readLines() {
  if (!fs.existsSync(AUDIT_PATH)) return [];
  return fs.readFileSync(AUDIT_PATH, 'utf8').split('\n').filter(Boolean);
}

function lastHash() {
  const lines = readLines();
  if (lines.length === 0) return GENESIS_HASH;
  return JSON.parse(lines[lines.length - 1]).hash;
}

// Every entry's hash commits to the previous entry's hash AND to every
// field of this entry except the hash itself. Change either input after
// the fact and the recomputed hash no longer matches what's on disk — that
// mismatch, not trust, is what verify-audit checks.
function append(correlationId, event, detail) {
  const prevHash = lastHash();
  const fields = {
    correlationId,
    at: new Date().toISOString(),
    event,
    detail,
    prevHash,
  };
  const hash = crypto.createHash('sha256').update(prevHash + stableStringify(fields)).digest('hex');
  const record = { ...fields, hash };

  fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
  fs.appendFileSync(AUDIT_PATH, JSON.stringify(record) + '\n');
  return record;
}

function readAll() {
  return readLines().map((line) => JSON.parse(line));
}

function forCorrelationId(correlationId) {
  return readAll().filter((record) => record.correlationId === correlationId);
}

// Walks from the genesis value, recomputing each entry's hash from its own
// fields and checking it against both what's stored and what the next
// entry claims as its prevHash. Returns the FIRST point of disagreement,
// not every subsequent one — once one entry is wrong, everything chained
// after it is reported relative to that one true break.
function verify() {
  const lines = readLines();
  let expectedPrev = GENESIS_HASH;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    let record;
    try {
      record = JSON.parse(lines[i]);
    } catch (err) {
      return { ok: false, lineNumber, correlationId: null, reason: `line is not valid JSON: ${err.message}` };
    }

    const { hash, ...fields } = record;

    if (fields.prevHash !== expectedPrev) {
      return {
        ok: false,
        lineNumber,
        correlationId: record.correlationId,
        reason: `prevHash "${fields.prevHash}" does not match the preceding entry's actual hash "${expectedPrev}"`,
      };
    }

    const recomputed = crypto.createHash('sha256').update(fields.prevHash + stableStringify(fields)).digest('hex');
    if (recomputed !== hash) {
      return {
        ok: false,
        lineNumber,
        correlationId: record.correlationId,
        reason: `stored hash "${hash}" does not match the hash recomputed from this entry's own fields "${recomputed}" — fields were edited after the hash was written`,
      };
    }

    expectedPrev = hash;
  }

  return { ok: true, count: lines.length };
}

module.exports = { append, readAll, forCorrelationId, verify, GENESIS_HASH };
