const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  deleteAuction,
  placeBid,
  getUserAuctions,
  getUserBids,
  getUserAuctionHistory,
  addToWatchlist,
  removeFromWatchlist,
  getUserWatchlist,
  getCategories,
  getWatchlistNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateAuctionStatus,
  extendAuction,
  cancelAuction
} = require('../controllers/auctionController');

// Import middleware
const { authenticate, optionalAuth, requireOwnershipOrAdmin, requireAdmin } = require('../middleware/auth');
const {
  validateAuctionCreation,
  validateBidPlacement,
  validateObjectId,
  validateAuctionQuery
} = require('../middleware/validation');

// Inline validators for moderation endpoints
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const validateStatusUpdate = [
  body('status').isIn(['active', 'paused']).withMessage('Status must be active or paused'),
  handleValidationErrors
];
const validateExtend = [
  body('extensionMinutes').optional().isInt({ min: 1, max: 10080 }).withMessage('extensionMinutes must be 1-10080'),
  body('extensionMs').optional().isInt({ min: 60000 }).withMessage('extensionMs must be at least 60000'),
  body('newEndTime').optional().isISO8601().withMessage('newEndTime must be ISO8601 date'),
  handleValidationErrors
];
const validateCancel = [
  body('reason').optional().isString().isLength({ max: 200 }).withMessage('Reason max length 200'),
  handleValidationErrors
];

// Public routes
router.get('/', validateAuctionQuery, getAuctions);
router.get('/categories', getCategories);
router.get('/:id', validateObjectId('id'), optionalAuth, getAuctionById);

// Protected routes (require authentication)
router.use(authenticate);

// Auction CRUD operations
router.post('/', validateAuctionCreation, createAuction);
router.post('/admin', requireAdmin, validateAuctionCreation, createAuction);
router.put('/:id', validateObjectId('id'), updateAuction);
router.delete('/:id', validateObjectId('id'), deleteAuction);

// Bidding
router.post('/:id/bid', validateObjectId('id'), validateBidPlacement, placeBid);

// Moderation endpoints
router.patch('/:id/status', validateObjectId('id'), validateStatusUpdate, updateAuctionStatus);
router.post('/:id/extend', validateObjectId('id'), validateExtend, extendAuction);
router.post('/:id/cancel', validateObjectId('id'), validateCancel, cancelAuction);

// Watchlist (provide aliases for /watch and /watchlist for frontend compatibility)
router.post('/:id/watch', validateObjectId('id'), addToWatchlist);
router.delete('/:id/watch', validateObjectId('id'), removeFromWatchlist);
router.post('/:id/watchlist', validateObjectId('id'), addToWatchlist);
router.delete('/:id/watchlist', validateObjectId('id'), removeFromWatchlist);

// User-specific auction routes
router.get('/user/:userId/selling', validateObjectId('userId'), requireOwnershipOrAdmin('userId'), getUserAuctions);
router.get('/user/:userId/bidding', validateObjectId('userId'), requireOwnershipOrAdmin('userId'), getUserBids);
router.get('/user/:userId/history', validateObjectId('userId'), requireOwnershipOrAdmin('userId'), getUserAuctionHistory);

// Current user's auctions (convenience routes)
router.get('/my/selling', (req, res, next) => {
  const uid = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id).toString() : '';
  req.params.userId = uid;
  getUserAuctions(req, res, next);
});

router.get('/my/bidding', (req, res, next) => {
  const uid = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id).toString() : '';
  req.params.userId = uid;
  getUserBids(req, res, next);
});

router.get('/my/history', (req, res, next) => {
  const uid = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id).toString() : '';
  req.params.userId = uid;
  getUserAuctionHistory(req, res, next);
});

router.get('/my/watchlist', getUserWatchlist);

// Watchlist notifications
router.get('/my/notifications', getWatchlistNotifications);
router.put('/notifications/:notificationId/read', markNotificationAsRead);
router.put('/notifications/read-all', markAllNotificationsAsRead);

module.exports = router;