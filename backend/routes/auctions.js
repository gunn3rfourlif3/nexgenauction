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
  markAllNotificationsAsRead
} = require('../controllers/auctionController');

// Import middleware
const { authenticate, optionalAuth, requireOwnershipOrAdmin, requireAdmin } = require('../middleware/auth');
const {
  validateAuctionCreation,
  validateBidPlacement,
  validateObjectId,
  validateAuctionQuery
} = require('../middleware/validation');

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
  req.params.userId = req.user._id.toString();
  getUserAuctions(req, res, next);
});

router.get('/my/bidding', (req, res, next) => {
  req.params.userId = req.user._id.toString();
  getUserBids(req, res, next);
});

router.get('/my/history', (req, res, next) => {
  req.params.userId = req.user._id.toString();
  getUserAuctionHistory(req, res, next);
});

router.get('/my/watchlist', getUserWatchlist);

// Watchlist notifications
router.get('/my/notifications', getWatchlistNotifications);
router.put('/notifications/:notificationId/read', markNotificationAsRead);
router.put('/notifications/read-all', markAllNotificationsAsRead);

module.exports = router;