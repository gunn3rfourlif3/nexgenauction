const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticateToken } = require('../middleware/auth');
const { validateTopUp, validateWithdrawal } = require('../middleware/validation');

// Get account balance and basic info
router.get('/balance', authenticateToken, accountController.getAccountBalance);

// Get transaction history
router.get('/transactions', authenticateToken, accountController.getTransactionHistory);

// Get specific transaction details
router.get('/transactions/:transactionId', authenticateToken, accountController.getTransactionDetails);

// Top-up account (deposit funds)
router.post('/topup', authenticateToken, validateTopUp, accountController.topUpAccount);

// Withdraw funds (if enabled)
router.post('/withdraw', authenticateToken, validateWithdrawal, accountController.withdrawFunds);

// Get account statistics
router.get('/stats', authenticateToken, accountController.getAccountStats);

module.exports = router;