const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const devMockStore = require('../services/devMockStore');
const mongoose = require('mongoose');

const {
  placeBid,
  getBidHistory,
  getCurrentBid,
  getUserBids,
  setAutoBid,
  getPayableBreakdown
} = require('../controllers/bidController');

const { authenticate } = require('../middleware/auth');
const { handleValidationErrors, validateObjectId, validatePaginationQuery } = require('../middleware/validation');

// Place a bid on an auction
router.post('/:auctionId/place', [
  authenticate,
  ...validateObjectId('auctionId'),
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
router.get('/:auctionId/history', [
  ...validateObjectId('auctionId'),
  ...validatePaginationQuery,
  (req, res, next) => {
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') || (!isDbConnected) || (((process.env.NODE_ENV || 'development') !== 'production') && process.env.FORCE_DB_CONNECTION !== 'true');
    if (!devFallbackEnabled) return next();
    try {
      const { auctionId } = req.params;
      const l = parseInt(req.query.limit || '20');
      const p = parseInt(req.query.page || '1');
      const a = devMockStore.getAuction(auctionId);
      const all = Array.isArray(a.bids) ? a.bids.slice() : [];
      all.sort((x, y) => {
        const byAmount = (y.amount || 0) - (x.amount || 0);
        if (byAmount !== 0) return byAmount;
        const xt = new Date(x.bidTime || x.timestamp || 0).getTime();
        const yt = new Date(y.bidTime || y.timestamp || 0).getTime();
        return yt - xt;
      });
      const start = (p - 1) * l;
      const end = start + l;
      const bids = all.slice(start, end);
      const totalBids = all.length;
      return res.json({
        success: true,
        data: {
          bids,
          pagination: {
            currentPage: p,
            totalPages: Math.ceil(totalBids / l),
            totalBids,
            hasMore: totalBids > p * l
          }
        }
      });
    } catch (e) {
      return next();
    }
  }
], getBidHistory);

// Get current highest bid for an auction
router.get('/:auctionId/current', [
  ...validateObjectId('auctionId'),
  (req, res, next) => {
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') || (!isDbConnected) || (((process.env.NODE_ENV || 'development') !== 'production') && process.env.FORCE_DB_CONNECTION !== 'true');
    if (!devFallbackEnabled) return next();
    try {
      const { auctionId } = req.params;
      const a = devMockStore.getAuction(auctionId);
      const all = Array.isArray(a.bids) ? a.bids.slice() : [];
      const highestBid = all.length > 0 ? all.reduce((prev, cur) => ((prev && prev.amount > cur.amount) ? prev : cur)) : null;
      const currentPrice = typeof a.currentBid === 'number' ? a.currentBid : a.startingPrice;
      const { calculateMinimumIncrement } = require('../controllers/bidController');
      const inc = typeof a.bidIncrement === 'number' && a.bidIncrement > 0 ? a.bidIncrement : calculateMinimumIncrement(currentPrice);
      const minimumNextBid = currentPrice + inc;
      const totalBids = all.length;
      return res.json({
        success: true,
        data: { currentBid: highestBid, currentPrice, minimumNextBid, totalBids, minimumIncrement: inc }
      });
    } catch (e) {
      return next();
    }
  }
], getCurrentBid);

// Get user's bids for an auction (requires authentication)
router.get('/:auctionId/my-bids', authenticate, validateObjectId('auctionId'), getUserBids);

// Compute total payable breakdown for a given bid amount
router.get('/:auctionId/payable', [
  ...validateObjectId('auctionId'),
  (req, res, next) => {
    const amount = Number(req.query.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    next();
  }
], async (req, res) => {
  try {
    const { auctionId } = req.params;
    const amount = Number(req.query.amount);
    const isDbConnected = require('mongoose').connection && require('mongoose').connection.readyState === 1;
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') || (!isDbConnected) || (((process.env.NODE_ENV || 'development') !== 'production') && process.env.FORCE_DB_CONNECTION !== 'true');
    let auction = null;
    if (devFallbackEnabled) {
      try { auction = require('../services/devMockStore').getAuction(auctionId); } catch (_) {}
    }
    if (!auction) {
      auction = await require('../models/Auction').findById(auctionId).select('buyersCommissionRate vatApplicable vatRate stcApplicable stcRate');
    }
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    const defaultCommission = 0.10;
    const defaultVat = 0.15;
    const commissionRate = typeof auction.buyersCommissionRate === 'number' ? auction.buyersCommissionRate : defaultCommission;
    const vatRate = typeof auction.vatRate === 'number' ? auction.vatRate : defaultVat;
    const applyVatOnBid = Boolean(auction.vatApplicable);
    const stcRate = Boolean(auction.stcApplicable) && typeof auction.stcRate === 'number' ? auction.stcRate : 0;
    const commission = amount * commissionRate;
    const vatOnCommission = commission * vatRate;
    const vatOnBid = applyVatOnBid ? (amount * vatRate) : 0;
    const stc = stcRate > 0 ? (amount * stcRate) : 0;
    const total = amount + commission + vatOnCommission + vatOnBid + stc;
    return res.json({ success: true, data: { bid: amount, commissionRate, commission, vatRate, vatOnBid, vatOnCommission, stcRate, stc, total } });
  } catch (e) {
    console.error('Payable breakdown error:', e);
    return res.status(500).json({ success: false, message: 'Failed to compute payable breakdown' });
  }
});

// Set auto-bid (proxy bidding)
router.post('/:auctionId/auto-bid', [
  authenticate,
  ...validateObjectId('auctionId'),
  body('maxAmount')
    .isNumeric()
    .withMessage('Maximum amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Maximum amount must be greater than 0'),
  handleValidationErrors
], setAutoBid);

module.exports = router;