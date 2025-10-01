const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  placeBid,
  getBidHistory,
  getCurrentBid,
  getUserBids,
  setAutoBid
} = require('../controllers/bidController');

const { authenticate } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Place a bid on an auction
router.post('/:auctionId/place', [
  authenticate,
  body('amount')
    .isNumeric()
    .withMessage('Bid amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Bid amount must be greater than 0'),
  
  body('bidType')
    .optional()
    .isIn(['manual', 'auto'])
    .withMessage('Bid type must be either manual or auto'),
  
  body('maxAutoBid')
    .optional()
    .isNumeric()
    .withMessage('Maximum auto bid must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Maximum auto bid must be greater than 0'),
  
  handleValidationErrors
], placeBid);

// Get bid history for an auction
router.get('/:auctionId/history', getBidHistory);

// Get current highest bid for an auction
router.get('/:auctionId/current', getCurrentBid);

// Get user's bids for an auction (requires authentication)
router.get('/:auctionId/my-bids', authenticate, getUserBids);

// Set auto-bid (proxy bidding)
router.post('/:auctionId/auto-bid', [
  authenticate,
  body('maxAmount')
    .isNumeric()
    .withMessage('Maximum amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Maximum amount must be greater than 0'),
  
  handleValidationErrors
], setAutoBid);

module.exports = router;