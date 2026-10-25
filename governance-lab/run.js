'use strict';

const { proposeAction } = require('./agent');
const { submit, approveAction, denyAction, listPendingSummaries } = require('./gate');
const audit = require('./audit');

function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      flags[arg.slice(2)] = args[i + 1];
      i++;
    } else {
      rest.push(arg);
    }
  }
  return { flags, rest };
}

function formatTimeLeft(expiresAt) {
  const ms = Date.parse(expiresAt) - Date.now();
  if (ms <= 0) return 'expired';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

// Every line printed about a decision is tagged with its correlationId, so
// the same id that's in the audit, decision, pending and ledger files can
// be grepped straight out of terminal output too.
function log(correlationId, line) {
  console.log(`[correlationId=${correlationId}] ${line}`);
}

function cmdRun() {
  const mode = process.env.AGENT_MODE || 'normal';
  const proposal = proposeAction(mode);
  const correlationId = proposal.actionId; // minted once, here, at the moment of proposal

  audit.append(correlationId, 'proposed', {
    actor: proposal.actor,
    actionType: proposal.actionType,
    resource: proposal.resource,
    amount: proposal.amount,
    context: proposal.context,
    reason: proposal.reason,
  });

  log(correlationId, 'PROPOSED ACTION:');
  console.log(JSON.stringify(proposal, null, 2));

  const { decision, ledgerEntry, pending } = submit(proposal);
  log(correlationId, 'GATE DECISION:');
  console.log(JSON.stringify(decision, null, 2));

  if (decision.verdict === 'allow') {
    log(correlationId, 'LEDGER ENTRY:');
    console.log(JSON.stringify(ledgerEntry));
  } else if (decision.verdict === 'escalate') {
    log(correlationId, 'ESCALATED — ACT DID NOT RUN. Parked for human review:');
    console.log(JSON.stringify(pending, null, 2));
  } else {
    log(correlationId, 'ACT DID NOT RUN — no ledger entry written.');
  }
}

function cmdApprove(actionId, flags) {
  if (!actionId) {
    console.error('usage: approve <actionId> --by <name>');
    process.exitCode = 1;
    return;
  }
  if (!flags.by || !flags.by.trim()) {
    console.error('approve requires a name: approve <actionId> --by <name>');
    process.exitCode = 1;
    return;
  }

  const result = approveAction(actionId, flags.by);
  const correlationId = (result.record && result.record.correlationId) || actionId;

  switch (result.outcome) {
    case 'not_found':
      console.error(`No pending action with id ${actionId}`);
      process.exitCode = 1;
      break;
    case 'already_spent':
      log(
        correlationId,
        `NOTHING DONE — this approval was already spent by ${result.record.resolvedBy} at ${result.record.resolvedAt}. The action did not run again.`
      );
      break;
    case 'already_denied':
      log(correlationId, `NOTHING DONE — this item was already denied by ${result.record.resolvedBy} at ${result.record.resolvedAt}.`);
      break;
    case 'expired':
      log(correlationId, `REFUSED — this item expired at ${result.record.expiresAt} and now reads as denied. Nothing was run.`);
      break;
    case 'approved':
      log(correlationId, 'APPROVED. The action ran exactly once.');
      log(correlationId, 'LEDGER ENTRY:');
      console.log(JSON.stringify(result.ledgerEntry));
      log(correlationId, 'RESOLVED PENDING ITEM:');
      console.log(JSON.stringify(result.record, null, 2));
      break;
    default:
      throw new Error(`Unhandled approve outcome: ${result.outcome}`);
  }
}

function cmdDeny(actionId, flags) {
  if (!actionId) {
    console.error('usage: deny <actionId> --by <name> [--reason <text>]');
    process.exitCode = 1;
    return;
  }
  if (!flags.by || !flags.by.trim()) {
    console.error('deny requires a name: deny <actionId> --by <name>');
    process.exitCode = 1;
    return;
  }

  const result = denyAction(actionId, flags.by, flags.reason);
  const correlationId = (result.record && result.record.correlationId) || actionId;

  switch (result.outcome) {
    case 'not_found':
      console.error(`No pending action with id ${actionId}`);
      process.exitCode = 1;
      break;
    case 'already_resolved':
      log(correlationId, `NOTHING DONE — already resolved as ${result.record.status} by ${result.record.resolvedBy}.`);
      break;
    case 'already_expired':
      log(correlationId, 'NOTHING DONE — this item already expired and reads as denied.');
      break;
    case 'denied':
      log(correlationId, 'DENIED. The action will not run.');
      console.log(JSON.stringify(result.record, null, 2));
      break;
    default:
      throw new Error(`Unhandled deny outcome: ${result.outcome}`);
  }
}

function cmdPending() {
  const waiting = listPendingSummaries().filter((item) => item.status === 'pending');
  if (waiting.length === 0) {
    console.log('Nothing waiting.');
    return;
  }
  console.log('PENDING APPROVALS:');
  for (const item of waiting) {
    console.log(
      `  correlationId=${item.correlationId}  risk=${item.riskScore}  rule=${item.ruleId}  waitingOn=${item.waitingOn}  timeLeft=${formatTimeLeft(item.expiresAt)}`
    );
  }
}

// why <correlationId> — replays one decision's whole life from audit.jsonl
// alone, in the order it actually happened. Nothing here reads ledger.jsonl,
// decisions.jsonl, or the pending files: if the audit log can't tell the
// whole story by itself, it isn't a replayable record, it's a side note.
function cmdWhy(correlationId) {
  if (!correlationId) {
    console.error('usage: why <correlationId>');
    process.exitCode = 1;
    return;
  }

  const events = audit.forCorrelationId(correlationId);
  if (events.length === 0) {
    console.error(`No audit history for correlationId ${correlationId}`);
    process.exitCode = 1;
    return;
  }

  const firstOf = (eventName) => events.find((e) => e.event === eventName);

  console.log(`STORY FOR ${correlationId}`);
  console.log('='.repeat(72));

  const proposed = firstOf('proposed');
  if (proposed) {
    const d = proposed.detail;
    console.log(`[${proposed.at}] PROPOSED`);
    console.log(`  ${d.actor} proposed "${d.actionType}" on ${d.resource} for amount ${JSON.stringify(d.amount)}`);
    console.log(`  stated reason: "${d.reason}"`);
    console.log(`  context: ${JSON.stringify(d.context)}`);
  }

  const evaluated = firstOf('evaluated');
  if (evaluated) {
    const d = evaluated.detail;
    console.log(`[${evaluated.at}] EVALUATED`);
    console.log(`  verdict: ${d.verdict}  (rule: ${d.ruleId})`);
    console.log(`  reason: ${d.reason}`);
  }

  const escalated = firstOf('escalated');
  if (escalated) {
    const d = escalated.detail;
    console.log(`[${escalated.at}] ESCALATED`);
    console.log(`  five factors: ${JSON.stringify(d.factors)}`);
    console.log(`  risk score: ${d.riskScore}`);
    console.log(`  waiting on: ${d.waitingOn}  (parked ${d.parkedAt}, expires ${d.expiresAt})`);
  }

  const approved = firstOf('approved');
  const denied = firstOf('denied');
  const expired = firstOf('expired');
  if (approved) {
    console.log(`[${approved.at}] APPROVED`);
    console.log(`  by ${approved.detail.by} at ${approved.detail.resolvedAt}`);
  } else if (denied) {
    const d = denied.detail;
    console.log(`[${denied.at}] DENIED`);
    console.log(`  by ${d.by} at ${d.resolvedAt}${d.reason ? ` — reason: ${d.reason}` : ''}`);
  } else if (expired) {
    const d = expired.detail;
    console.log(`[${expired.at}] EXPIRED`);
    console.log(`  no human decided before ${d.expiresAt} — treated as denied automatically`);
  } else if (escalated) {
    console.log('STILL PENDING — no approve, deny, or expiry recorded yet.');
  }

  const executed = firstOf('executed');
  if (executed) {
    console.log(`[${executed.at}] EXECUTED`);
    console.log(`  side effect fired: ${JSON.stringify(executed.detail.ledgerEntry)}`);
  } else {
    console.log('NO SIDE EFFECT FIRED — this action never ran.');
  }

  console.log('='.repeat(72));
}

function cmdVerifyAudit() {
  const result = audit.verify();
  if (result.ok) {
    console.log(`AUDIT CHAIN INTACT — ${result.count} entr${result.count === 1 ? 'y' : 'ies'} verified from genesis to tip.`);
    return;
  }
  console.log(`AUDIT CHAIN BROKEN at line ${result.lineNumber} (correlationId: ${result.correlationId}) — ${result.reason}`);
  process.exitCode = 1;
}

const [, , command, ...args] = process.argv;

if (!command) {
  cmdRun();
} else if (command === 'approve') {
  const { flags, rest } = parseFlags(args);
  cmdApprove(rest[0], flags);
} else if (command === 'deny') {
  const { flags, rest } = parseFlags(args);
  cmdDeny(rest[0], flags);
} else if (command === 'pending') {
  cmdPending();
} else if (command === 'why') {
  cmdWhy(args[0]);
} else if (command === 'verify-audit') {
  cmdVerifyAudit();
} else {
  console.error(`Unknown command: ${command}`);
  console.error(
    'usage: node run.js | approve <actionId> --by <name> | deny <actionId> --by <name> [--reason <text>] | pending | why <correlationId> | verify-audit'
  );
  process.exitCode = 1;
}
