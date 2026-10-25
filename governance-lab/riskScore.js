'use strict';

// Five factors, each a plain fact about the action, weighted toward what
// actually predicts a bad refund: a new account, a burst of same-day
// refunds, an address swapped right after the order, and how far past the
// policy limit this request already sits. The weights are deliberately
// simple (no model, no training data) so an approver can recompute the
// score by hand from the factors alone — a score nobody can audit is just
// a second opaque gate.
const WEIGHTS = {
  amountPerDollar: 1 / 100,
  newAccountFlat: 20,
  priorRefundPerCount: 15,
  addressChangedFlat: 30,
  overLimitFlat: 10,
};

const NEW_ACCOUNT_THRESHOLD_DAYS = 30;

function computeRiskScore(action, limit) {
  const context = action.context || {};
  const amount = action.amount || 0;
  const accountAgeDays = context.accountAgeDays ?? null;
  const priorRefundsToday = context.priorRefundsToday ?? 0;
  const addressChangedAfterOrder = Boolean(context.addressChangedAfterOrder);
  const amountOverLimit = typeof limit === 'number' ? Math.max(0, amount - limit) : 0;

  const factors = {
    amount,
    accountAgeDays,
    priorRefundsToday,
    addressChangedAfterOrder,
    amountOverLimit,
  };

  let score = amount * WEIGHTS.amountPerDollar;
  if (accountAgeDays !== null && accountAgeDays < NEW_ACCOUNT_THRESHOLD_DAYS) {
    score += WEIGHTS.newAccountFlat;
  }
  score += priorRefundsToday * WEIGHTS.priorRefundPerCount;
  if (addressChangedAfterOrder) score += WEIGHTS.addressChangedFlat;
  if (amountOverLimit > 0) score += WEIGHTS.overLimitFlat;

  return { score: Math.round(score * 10) / 10, factors };
}

module.exports = { computeRiskScore };
