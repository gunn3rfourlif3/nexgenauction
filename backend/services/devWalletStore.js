// In-memory wallet store for development without MongoDB
// Tracks per-user balances and transactions to support balance/top-up flows

const { v4: uuidv4 } = require('uuid');

const wallets = new Map(); // userId => { balance, currency, lastTransactionDate, transactions: [] }

function ensureWallet(userId) {
  if (!wallets.has(userId)) {
    wallets.set(userId, {
      balance: 0,
      currency: 'USD',
      lastTransactionDate: null,
      transactions: []
    });
  }
  return wallets.get(userId);
}

function getWallet(userId) {
  const w = ensureWallet(userId);
  return {
    balance: w.balance,
    currency: w.currency,
    lastTransactionDate: w.lastTransactionDate
  };
}

function getTransactions(userId) {
  const w = ensureWallet(userId);
  return w.transactions.slice().sort((a, b) => b.createdAt - a.createdAt);
}

function topUp(userId, { amount, currency = 'USD', paymentMethod = 'development' }) {
  const w = ensureWallet(userId);
  const amt = parseFloat(amount);
  const before = w.balance || 0;
  const after = before + amt;
  w.balance = after;
  w.currency = currency || w.currency || 'USD';
  w.lastTransactionDate = new Date();

  const txn = {
    transactionId: uuidv4(),
    type: 'deposit',
    category: 'wallet',
    user: userId,
    amount: amt,
    currency: w.currency,
    exchangeRate: 1.0,
    baseAmount: amt,
    balanceBefore: before,
    balanceAfter: after,
    status: 'completed',
    paymentMethod: 'wallet',
    description: `Account top-up via ${paymentMethod || 'internal'}`,
    gatewayTransactionId: `dev_${uuidv4()}`,
    processedAt: new Date(),
    metadata: {
      source: 'development',
      reference: 'dev_topup',
      tags: ['dev', 'topup']
    },
    createdAt: new Date()
  };
  w.transactions.push(txn);

  return { transaction: txn, newBalance: after, currency: w.currency };
}

module.exports = {
  getWallet,
  getTransactions,
  topUp
};