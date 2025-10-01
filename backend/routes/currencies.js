const express = require('express');
const router = express.Router();
const currencyService = require('../services/currencyService');
const { body, validationResult } = require('express-validator');

/**
 * Get supported currencies
 */
router.get('/supported', async (req, res) => {
  try {
    const currencies = currencyService.getSupportedCurrencies();
    
    res.json({
      success: true,
      data: {
        currencies: currencies.map(code => ({
          code,
          ...currencyService.getCurrencyInfo(code)
        }))
      }
    });
  } catch (error) {
    console.error('Get supported currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported currencies',
      error: error.message
    });
  }
});

/**
 * Get exchange rates
 */
router.get('/rates', async (req, res) => {
  try {
    const { from = 'USD', to } = req.query;
    
    if (!currencyService.isSupportedCurrency(from)) {
      return res.status(400).json({
        success: false,
        message: 'Source currency not supported'
      });
    }

    let rates;
    if (to) {
      if (!currencyService.isSupportedCurrency(to)) {
        return res.status(400).json({
          success: false,
          message: 'Target currency not supported'
        });
      }
      
      const rate = await currencyService.getExchangeRate(from, to);
      rates = { [to]: rate };
    } else {
      // Get rates for all supported currencies
      const supportedCurrencies = currencyService.getSupportedCurrencies();
      rates = {};
      
      for (const currency of supportedCurrencies) {
        if (currency !== from) {
          rates[currency] = await currencyService.getExchangeRate(from, currency);
        }
      }
    }

    res.json({
      success: true,
      data: {
        base: from,
        rates,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exchange rates',
      error: error.message
    });
  }
});

/**
 * Convert currency amounts
 */
router.post('/convert', [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('from').isString().isLength({ min: 3, max: 3 }).withMessage('Source currency must be 3 characters'),
  body('to').isString().isLength({ min: 3, max: 3 }).withMessage('Target currency must be 3 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, from, to } = req.body;

    if (!currencyService.isSupportedCurrency(from)) {
      return res.status(400).json({
        success: false,
        message: 'Source currency not supported'
      });
    }

    if (!currencyService.isSupportedCurrency(to)) {
      return res.status(400).json({
        success: false,
        message: 'Target currency not supported'
      });
    }

    const convertedAmount = await currencyService.convertCurrency(amount, from, to);
    const exchangeRate = await currencyService.getExchangeRate(from, to);

    res.json({
      success: true,
      data: {
        originalAmount: amount,
        convertedAmount,
        fromCurrency: from,
        toCurrency: to,
        exchangeRate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency',
      error: error.message
    });
  }
});

/**
 * Get popular currency pairs
 */
router.get('/popular-pairs', async (req, res) => {
  try {
    const pairs = currencyService.getPopularPairs();
    
    res.json({
      success: true,
      data: {
        pairs
      }
    });
  } catch (error) {
    console.error('Get popular pairs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular currency pairs',
      error: error.message
    });
  }
});

module.exports = router;