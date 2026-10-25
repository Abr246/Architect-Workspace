'use strict';

const fs = require('fs');
const path = require('path');
const { computeRiskScore } = require('./riskScore');
const audit = require('./audit');

const PENDING_DIR = path.join(__dirname, 'data', 'pending');
const DEFAULT_TTL_MS = 60 * 60 * 1000; // one hour

const APPROVER_BY_ACTION_TYPE = {
  refund: 'finance-approver',
};

function approverFor(actionType) {
  return APPROVER_BY_ACTION_TYPE[actionType] || 'any-approver';
}

function ttlMs() {
  const override = process.env.ESCALATION_TTL_MS;
  if (override === undefined || override === '') return DEFAULT_TTL_MS;
  const parsed = Number(override);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`ESCALATION_TTL_MS must be a positive number of milliseconds, got: ${override}`);
  }
  return parsed;
}

function pendingPath(actionId) {
  return path.join(PENDING_DIR, `${actionId}.json`);
}

function persist(record) {
  fs.writeFileSync(pendingPath(record.actionId), JSON.stringify(record, null, 2));
}

function writePending(action, decision, limit) {
  const { score, factors } = computeRiskScore(action, limit);
  const now = Date.now();
  const record = {
    correlationId: action.actionId,
    actionId: action.actionId,
    action,
    factors,
    riskScore: score,
    ruleId: decision.ruleId,
    reason: decision.reason,
    waitingOn: approverFor(action.actionType),
    status: 'pending',
    parkedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs()).toISOString(),
    resolvedBy: null,
    resolvedAt: null,
    resolutionReason: null,
  };
  fs.mkdirSync(PENDING_DIR, { recursive: true });
  persist(record);
  audit.append(record.correlationId, 'escalated', {
    riskScore: record.riskScore,
    factors: record.factors,
    ruleId: record.ruleId,
    reason: record.reason,
    waitingOn: record.waitingOn,
    parkedAt: record.parkedAt,
    expiresAt: record.expiresAt,
  });
  return record;
}

function readRaw(actionId) {
  const file = pendingPath(actionId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// A pending item past its expiry is DENIED, automatically, the instant
// anything reads it — silence is not consent. This mutates the record on
// disk the first time the expiry is noticed, so the file itself becomes
// the audit trail instead of a clock calculation every reader redoes.
function materialize(record) {
  if (record.status === 'pending' && Date.now() > Date.parse(record.expiresAt)) {
    record.status = 'denied';
    record.resolvedBy = 'system';
    record.resolvedAt = record.expiresAt;
    record.resolutionReason = 'expired without a decision';
    persist(record);
    audit.append(record.correlationId, 'expired', {
      expiresAt: record.expiresAt,
      resolvedAt: record.resolvedAt,
      reason: record.resolutionReason,
    });
  }
  return record;
}

function readPending(actionId) {
  const record = readRaw(actionId);
  if (!record) return null;
  return materialize(record);
}

function listPending() {
  if (!fs.existsSync(PENDING_DIR)) return [];
  return fs
    .readdirSync(PENDING_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readPending(path.basename(f, '.json')))
    .sort((a, b) => Date.parse(a.parkedAt) - Date.parse(b.parkedAt));
}

// The only way a pending item's status changes from 'pending'. Re-reads
// (and re-materializes expiry) immediately before writing, so a decision
// can never be recorded against an item that already resolved itself.
function resolve(actionId, status, by, reason) {
  const record = readPending(actionId);
  if (!record) return { error: 'not_found' };
  if (record.status !== 'pending') return { error: 'already_resolved', record };
  record.status = status;
  record.resolvedBy = by;
  record.resolvedAt = new Date().toISOString();
  record.resolutionReason = reason || null;
  persist(record);
  audit.append(record.correlationId, status, {
    by: record.resolvedBy,
    resolvedAt: record.resolvedAt,
    reason: record.resolutionReason,
  });
  return { record };
}

module.exports = { writePending, readPending, listPending, resolve, PENDING_DIR };
