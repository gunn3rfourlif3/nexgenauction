const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const oauthRoutes = require('./oauth');
const auctionRoutes = require('./auctions');
const categoryRoutes = require('./categories');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'NexGenAuction API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API status endpoint
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'NexGenAuction API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/api/auth',
        oauth: '/api/auth/oauth',
        auctions: '/api/auctions',
        categories: '/api/categories'
      }
    }
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/auth/oauth', oauthRoutes);
router.use('/auctions', auctionRoutes);
router.use('/categories', categoryRoutes);

// 404 handler for API routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/status',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auctions',
      'GET /api/categories'
    ]
  });
});

module.exports = router;