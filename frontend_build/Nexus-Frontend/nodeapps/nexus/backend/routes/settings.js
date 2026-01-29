const express = require('express');
const router = express.Router();
const { getHero, updateHero, getFees, updateFees, getCurrencySettings, updateCurrencySettings } = require('../controllers/settingsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/hero', getHero);
router.put('/hero', authenticate, requireAdmin, updateHero);
router.get('/fees', getFees);
router.put('/fees', authenticate, requireAdmin, updateFees);
router.get('/currency', getCurrencySettings);
router.put('/currency', authenticate, requireAdmin, updateCurrencySettings);

module.exports = router;