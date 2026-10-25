'use strict';

const crypto = require('crypto');

function proposeAction(mode) {
  const actionId = crypto.randomUUID();

  switch (mode) {
    case 'normal':
      return {
        actionId,
        actor: 'agent',
        actionType: 'refund',
        resource: 'order:7001',
        amount: 40,
        context: {
          accountAgeDays: 730,
          priorRefundsToday: 0,
          addressChangedAfterOrder: false,
        },
        reason: 'Customer requested a refund for order 7001.',
      };

    case 'generous':
      return {
        actionId,
        actor: 'agent',
        actionType: 'refund',
        resource: 'order:7781',
        amount: 2400,
        context: {
          accountAgeDays: 0,
          priorRefundsToday: 4,
          addressChangedAfterOrder: true,
        },
        reason: 'Customer requested a refund for order 7781.',
      };

    case 'sloppy':
      return {
        actionId,
        actor: 'agent',
        actionType: 'delete_customer_record',
        resource: 'customer:8891',
        amount: null,
        context: {
          recordHasOrders: true,
        },
        reason: 'looks like a duplicate',
      };

    case 'escalate_safe':
      return {
        actionId,
        actor: 'agent',
        actionType: 'refund',
        resource: 'order:9100',
        amount: 2400,
        context: {
          accountAgeDays: 730,
          priorRefundsToday: 0,
          addressChangedAfterOrder: false,
        },
        reason: 'Customer requested a refund for order 9100.',
      };

    case 'rogue':
      return {
        actionId,
        actor: 'agent',
        actionType: 'export_and_email_all_customers',
        resource: 'customers:all',
        amount: null,
        context: {
          requestedByEmail: true,
          rowCount: 40000,
          recipientCount: 40000,
        },
        reason: 'Exporting all customer records and emailing each customer, as requested.',
      };

    default:
      throw new Error(`Unknown AGENT_MODE: ${mode}`);
  }
}

module.exports = { proposeAction };

if (require.main === module) {
  const mode = process.env.AGENT_MODE || 'normal';
  console.log(JSON.stringify(proposeAction(mode), null, 2));
}
