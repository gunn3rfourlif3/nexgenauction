const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  getPayment,
  getPaymentHistory,
  releaseEscrow,
  requestRefund,
  confirmDelivery,
  getEscrowStatus,
  getTransactionHistory,
  handleStripeWebhook
} = require('../controllers/paymentController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Payment intent creation validation
const validatePaymentIntent = [
  body('auctionId')
    .isMongoId()
    .withMessage('Valid auction ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),
  body('paymentMethod')
    .optional()
    .isIn(['stripe', 'paypal'])
    .withMessage('Invalid payment method'),
  handleValidationErrors
];

// Payment confirmation validation
const validatePaymentConfirmation = [
  param('paymentId')
    .isLength({ min: 1 })
    .withMessage('Payment ID is required'),
  body('paymentIntentId')
    .isLength({ min: 1 })
    .withMessage('Payment intent ID is required'),
  handleValidationErrors
];

// Payment ID validation
const validatePaymentId = [
  param('paymentId')
    .isLength({ min: 1 })
    .withMessage('Payment ID is required'),
  handleValidationErrors
];

// Escrow release validation
const validateEscrowRelease = [
  param('paymentId')
    .isLength({ min: 1 })
    .withMessage('Payment ID is required'),
  body('reason')
    .optional()
    .isIn(['item_delivered', 'buyer_satisfied', 'dispute_resolved', 'admin_release'])
    .withMessage('Invalid release reason'),
  handleValidationErrors
];

// Refund request validation
const validateRefundRequest = [
  param('paymentId')
    .isLength({ min: 1 })
    .withMessage('Payment ID is required'),
  body('reason')
    .isLength({ min: 10, max: 500 })
    .withMessage('Refund reason must be between 10 and 500 characters'),
  handleValidationErrors
];

// Delivery confirmation validation
const validateDeliveryConfirmation = [
  param('paymentId')
    .isLength({ min: 1 })
    .withMessage('Payment ID is required'),
  body('trackingNumber')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tracking number must be between 1 and 100 characters'),
  body('carrier')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Carrier name must be between 1 and 50 characters'),
  handleValidationErrors
];

// Query validation for lists
const validateListQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid status'),
  handleValidationErrors
];

// Transaction history query validation
const validateTransactionQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['payment', 'refund', 'escrow_hold', 'escrow_release', 'fee', 'payout', 'deposit', 'withdrawal'])
    .withMessage('Invalid transaction type'),
  query('category')
    .optional()
    .isIn(['auction', 'fee', 'refund', 'payout', 'deposit', 'withdrawal'])
    .withMessage('Invalid transaction category'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid transaction status'),
  handleValidationErrors
];

// Public routes (no authentication required)
// Stripe webhook endpoint (must be before other routes and without auth)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Protected routes (authentication required)
router.use(authenticateToken);

// Payment management routes
router.post('/intent', validatePaymentIntent, createPaymentIntent);
router.post('/:paymentId/confirm', validatePaymentConfirmation, confirmPayment);
router.get('/:paymentId', validatePaymentId, getPayment);
router.get('/', validateListQuery, getPaymentHistory);

// Escrow management routes
router.post('/:paymentId/release-escrow', validateEscrowRelease, releaseEscrow);
router.post('/:paymentId/request-refund', validateRefundRequest, requestRefund);
router.post('/:paymentId/confirm-delivery', validateDeliveryConfirmation, confirmDelivery);
router.get('/:paymentId/escrow-status', validatePaymentId, getEscrowStatus);

// Transaction history
router.get('/transactions/history', validateTransactionQuery, getTransactionHistory);

// Admin-only routes
router.use(requireRole);

// Admin payment management (future implementation)
router.get('/admin/all', validateListQuery, async (req, res) => {
  // TODO: Implement admin view of all payments
  res.status(501).json({
    success: false,
    message: 'Admin payment management not yet implemented'
  });
});

router.post('/admin/:paymentId/force-release', validatePaymentId, async (req, res) => {
  // TODO: Implement admin force release
  res.status(501).json({
    success: false,
    message: 'Admin force release not yet implemented'
  });
});

router.post('/admin/:paymentId/force-refund', validatePaymentId, async (req, res) => {
  // TODO: Implement admin force refund
  res.status(501).json({
    success: false,
    message: 'Admin force refund not yet implemented'
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Payment route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload'
    });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

module.exports = router;