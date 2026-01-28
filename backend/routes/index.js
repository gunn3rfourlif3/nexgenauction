const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import route modules
const authRoutes = require('./auth');
const oauthRoutes = require('./oauth');
const auctionRoutes = require('./auctions');
const categoryRoutes = require('./categories');
const bidRoutes = require('./bids');
const paymentRoutes = require('./payments');
const currencyRoutes = require('./currencies');
const accountRoutes = require('./account');
const placeholderRoutes = require('./placeholder');
const settingsRoutes = require('./settings');
const depositsRoutes = require('./deposits');
const assistantRoutes = require('./assistant');

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
  const conn = mongoose && mongoose.connection;
  const readyState = conn && typeof conn.readyState === 'number' ? conn.readyState : -1;
  const isConnected = readyState === 1;
  const host = (conn && conn.host) || (conn && conn.client && conn.client.s && conn.client.s.url) || undefined;
  res.json({
    success: true,
    data: {
      service: 'NexGenAuction API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: {
        isConnected,
        readyState,
        host: host
      },
      endpoints: {
        auth: '/api/auth',
        oauth: '/api/auth/oauth',
        auctions: '/api/auctions',
        categories: '/api/categories',
        bids: '/api/bids',
        payments: '/api/payments',
        currencies: '/api/currencies',
        account: '/api/account',
        placeholder: '/api/placeholder/:w/:h',
        settings: '/api/settings/hero',
        assistant: '/api/assistant'
      }
    }
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/auth/oauth', oauthRoutes);
router.use('/auctions', auctionRoutes);
router.use('/categories', categoryRoutes);
router.use('/bids', bidRoutes);
router.use('/payments', paymentRoutes);
router.use('/currencies', currencyRoutes);
router.use('/account', accountRoutes);
router.use('/placeholder', placeholderRoutes);
router.use('/settings', settingsRoutes);
router.use('/deposits', depositsRoutes);
router.use('/assistant', assistantRoutes);

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