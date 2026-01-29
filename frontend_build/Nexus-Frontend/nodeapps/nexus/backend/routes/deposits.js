const express = require('express');
const router = express.Router();

const { webhookDev, devPay } = require('../controllers/depositController');

// Dev simulation endpoint (GET)
router.get('/dev/pay', devPay);

// Placeholder webhook (POST)
router.post('/webhook/dev', webhookDev);

module.exports = router;