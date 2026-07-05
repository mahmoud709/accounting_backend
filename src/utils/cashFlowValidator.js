const mongoose = require('mongoose');
const Check = require('../models/Check');
const Account = require('../models/Account');

/**
 * calculatePredictiveBalance
 * @param {String|mongoose.Types.ObjectId} accountId - Account ID to evaluate
 * @param {Date} upToDate - Date up to which pending checks are considered (inclusive)
 * @returns {Promise<Number>} predicted available balance (numeric)
 */
async function calculatePredictiveBalance(accountId, upToDate) {
  // Fetch account to get current balance (stored as string)
  const account = await Account.findById(accountId).select('currentBalance allowOverdraft');
  if (!account) throw new Error('Account not found');
  const currentBalance = Number(account.currentBalance);

  // Fetch pending checks linked to this account with dueDate <= upToDate
  const pendingChecks = await Check.find({
    linkedAccount: accountId,
    status: 'Pending',
    dueDate: { $lte: upToDate },
  }).select('type amount');

  let inflow = 0; // Receivable (incoming money)
  let outflow = 0; // Payable (outgoing money)
  pendingChecks.forEach((chk) => {
    const amt = Number(chk.amount);
    if (chk.type === 'Receivable') inflow += amt; // we will receive money
    else if (chk.type === 'Payable') outflow += amt; // we will pay money
  });

  // Predictive balance = current + inflow - outflow
  const predicted = currentBalance + inflow - outflow;
  return predicted;
}

module.exports = { calculatePredictiveBalance };
