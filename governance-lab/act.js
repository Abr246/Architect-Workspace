'use strict';

const fs = require('fs');
const path = require('path');

const LEDGER_PATH = path.join(__dirname, 'data', 'ledger.jsonl');

function performAct(proposal) {
  const entry = {
    correlationId: proposal.actionId,
    actionId: proposal.actionId,
    actionType: proposal.actionType,
    resource: proposal.resource,
    amount: proposal.amount,
    at: new Date().toISOString(),
  };

  if (proposal.actionType === 'delete_customer_record') {
    entry.recordsDeleted = 1;
  }

  if (proposal.actionType === 'export_and_email_all_customers') {
    entry.rowsExported = proposal.context.rowCount;
    entry.emailsSent = proposal.context.recipientCount;
  }

  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.appendFileSync(LEDGER_PATH, JSON.stringify(entry) + '\n');

  return entry;
}

// Whoever calls claimActor() first gets the one working reference to
// performAct(); every call after that gets a stub that throws instead.
// gate.js claims it at module load time, before any other code in the
// process runs, so this is what makes "only through the gate" true of the
// module graph itself, not just of what callers are asked nicely to do.
let claimed = false;
function claimActor() {
  if (claimed) {
    return () => {
      throw new Error('act() may only be invoked through the gate — this caller did not claim it first.');
    };
  }
  claimed = true;
  return performAct;
}

module.exports = { claimActor };
