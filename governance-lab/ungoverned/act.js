'use strict';

// No gate, no claim pattern, no policy check. In the governed copy, act()
// can only be reached through gate.js's one-time claim — that is the thing
// standing between a proposal and it being carried out. Here there is
// nothing standing between them: whatever the agent proposes, this runs.
const fs = require('fs');
const path = require('path');

const LEDGER_PATH = path.join(__dirname, 'data', 'ledger.jsonl');

function performAct(proposal) {
  const entry = {
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

module.exports = { performAct };
