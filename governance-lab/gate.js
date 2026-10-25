'use strict';

const fs = require('fs');
const path = require('path');
const { claimActor } = require('./act');
const pending = require('./pending');
const audit = require('./audit');

const POLICY_PATH = path.join(__dirname, 'policy.json');
const DECISIONS_PATH = path.join(__dirname, 'data', 'decisions.jsonl');

// Claimed once, here, at load time. This is the only working reference to
// act() that will ever exist in this process — see act.js for why a second
// claim attempt from anywhere else gets a stub that throws instead.
const act = claimActor();

const OPERATORS = {
  greaterThan: {
    test: (actual, limit) => actual > limit,
    triggeredPhrase: 'exceeds',
    passedPhrase: 'does not exceed',
  },
};

function loadPolicy() {
  return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
}

function getRuleById(ruleId) {
  return loadPolicy().rules.find((rule) => rule.id === ruleId);
}

function logDecision(action, decision) {
  const entry = {
    correlationId: action.actionId,
    actionId: action.actionId,
    actionType: action.actionType,
    amount: action.amount,
    verdict: decision.verdict,
    ruleId: decision.ruleId,
    reason: decision.reason,
    at: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(DECISIONS_PATH), { recursive: true });
  fs.appendFileSync(DECISIONS_PATH, JSON.stringify(entry) + '\n');
}

// act() may only ever be invoked through this helper, so every side effect
// that actually fires — whether allowed immediately or approved later —
// lands exactly one 'executed' audit entry carrying the ledger line.
function actAndRecord(correlationId, proposal) {
  const ledgerEntry = act(proposal);
  audit.append(correlationId, 'executed', { ledgerEntry });
  return ledgerEntry;
}

function evaluate(action) {
  const policy = loadPolicy();
  const applicableRules = policy.rules.filter((rule) => rule.actionType === action.actionType);

  let decision = null;

  for (const rule of applicableRules) {
    const operator = OPERATORS[rule.operator];
    const actualValue = action[rule.field];
    if (operator.test(actualValue, rule.value)) {
      decision = {
        verdict: rule.verdict,
        ruleId: rule.id,
        reason: `${rule.id}: ${rule.field} ${actualValue} ${operator.triggeredPhrase} ${rule.value}`,
      };
      break;
    }
  }

  if (!decision && applicableRules.length > 0) {
    const rule = applicableRules[0];
    const operator = OPERATORS[rule.operator];
    const actualValue = action[rule.field];
    decision = {
      verdict: 'allow',
      ruleId: rule.id,
      reason: `${rule.id}: ${rule.field} ${actualValue} ${operator.passedPhrase} ${rule.value}`,
    };
  }

  if (!decision) {
    decision = { verdict: 'deny', ruleId: 'default-deny', reason: 'no rule permits this action' };
  }

  logDecision(action, decision);
  audit.append(action.actionId, 'evaluated', {
    verdict: decision.verdict,
    ruleId: decision.ruleId,
    reason: decision.reason,
  });
  return decision;
}

// The only function in this module (or anywhere) that can make act() run
// on first submission. escalate never reaches act() here — it only gets
// there later, exactly once, through approveAction below.
function submit(action) {
  const decision = evaluate(action);

  if (decision.verdict === 'allow') {
    const ledgerEntry = actAndRecord(action.actionId, action);
    return { decision, ledgerEntry };
  }

  if (decision.verdict === 'escalate') {
    const rule = getRuleById(decision.ruleId);
    const limit = rule && typeof rule.value === 'number' ? rule.value : undefined;
    const parked = pending.writePending(action, decision, limit);
    return { decision, ledgerEntry: null, pending: parked };
  }

  return { decision, ledgerEntry: null };
}

// approve <actionId> --by <name>. The action runs exactly once: resolve()
// flips status away from 'pending' before act() is ever called, so a
// second call on the same id finds status already 'approved' and never
// reaches act() at all — there is no window where it could run twice.
function approveAction(actionId, approverName) {
  if (!approverName || !approverName.trim()) {
    throw new Error('approve requires a name (--by <name>)');
  }

  const record = pending.readPending(actionId); // also materializes expiry
  if (!record) return { outcome: 'not_found' };

  if (record.status === 'approved') {
    return { outcome: 'already_spent', record };
  }
  if (record.status === 'denied') {
    return { outcome: record.resolvedBy === 'system' ? 'expired' : 'already_denied', record };
  }

  const result = pending.resolve(actionId, 'approved', approverName.trim());
  if (result.error) {
    // Resolved by someone else between the read above and this write.
    return { outcome: 'already_spent', record: result.record };
  }

  const ledgerEntry = actAndRecord(result.record.correlationId, result.record.action);
  return { outcome: 'approved', record: result.record, ledgerEntry };
}

// deny <actionId> --by <name> [reason]. The action never runs.
function denyAction(actionId, denierName, reason) {
  if (!denierName || !denierName.trim()) {
    throw new Error('deny requires a name (--by <name>)');
  }

  const record = pending.readPending(actionId);
  if (!record) return { outcome: 'not_found' };

  if (record.status !== 'pending') {
    return { outcome: record.resolvedBy === 'system' ? 'already_expired' : 'already_resolved', record };
  }

  const result = pending.resolve(actionId, 'denied', denierName.trim(), reason);
  if (result.error) {
    return { outcome: 'already_resolved', record: result.record };
  }
  return { outcome: 'denied', record: result.record };
}

function listPendingSummaries() {
  return pending.listPending();
}

module.exports = { evaluate, submit, approveAction, denyAction, listPendingSummaries };
