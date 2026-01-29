const SiteSettings = require('../models/SiteSettings');
const { ENABLE_DEV_MOCK_ON_FAILURE } = process.env;
const currencyService = require('../services/currencyService');

let devSettingsCache = {
  hero: {
    title: 'Welcome to Nexus Auctions',
    subtitle: 'Discover unique items, bid with confidence, and experience the future of online auctions',
    theme: 'default',
    images: [],
    primaryCta: { text: 'Browse Auctions', link: '/auctions' },
    secondaryCta: { text: 'Start Selling', link: '/create-auction' }
  },
  fees: { commissionRate: 0.10, vatRate: 0.15 }
};

const getHero = async (req, res) => {
  try {
    const connReady = !!(SiteSettings.db && SiteSettings.db.readyState === 1);
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (((process.env.NODE_ENV || 'development') !== 'production') && process.env.FORCE_DB_CONNECTION !== 'true') ||
      (ENABLE_DEV_MOCK_ON_FAILURE === 'true');
    if (!connReady && devFallbackEnabled) {
      return res.json({ success: true, data: { hero: devSettingsCache.hero } });
    }
    let doc = await SiteSettings.findOne({ key: 'site' });
    if (!doc) {
      doc = await SiteSettings.create({ key: 'site' });
    }
    return res.json({ success: true, data: { hero: doc.hero } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

const updateHero = async (req, res) => {
  try {
    const payload = req.body || {};
    const hero = {
      title: String(payload.title || '').trim() || 'Welcome to Nexus Auctions',
      subtitle: String(payload.subtitle || '').trim() || 'Discover unique items, bid with confidence, and experience the future of online auctions',
      theme: String(payload.theme || '').trim() || 'default',
      images: Array.isArray(payload.images) ? payload.images.filter(x => x && x.url).map(x => ({ url: String(x.url), alt: String(x.alt || '') })) : [],
      primaryCta: {
        text: String((payload.primaryCta || {}).text || '').trim() || 'Browse Auctions',
        link: String((payload.primaryCta || {}).link || '').trim() || '/auctions'
      },
      secondaryCta: {
        text: String((payload.secondaryCta || {}).text || '').trim() || 'Start Selling',
        link: String((payload.secondaryCta || {}).link || '').trim() || '/create-auction'
      }
    };
    const connReady = !!(SiteSettings.db && SiteSettings.db.readyState === 1);
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (((process.env.NODE_ENV || 'development') !== 'production') && process.env.FORCE_DB_CONNECTION !== 'true') ||
      (ENABLE_DEV_MOCK_ON_FAILURE === 'true');
    if (!connReady && devFallbackEnabled) {
      devSettingsCache.hero = hero;
      return res.json({ success: true, data: { hero } });
    }
    const updated = await SiteSettings.findOneAndUpdate(
      { key: 'site' },
      { $set: { hero } },
      { upsert: true, new: true }
    );
    return res.json({ success: true, data: { hero: updated.hero } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

const getFees = async (req, res) => {
  try {
    const connReady = !!(SiteSettings.db && SiteSettings.db.readyState === 1);
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (((process.env.NODE_ENV || 'development') !== 'production') && process.env.FORCE_DB_CONNECTION !== 'true') ||
      (ENABLE_DEV_MOCK_ON_FAILURE === 'true');
    if (!connReady && devFallbackEnabled) {
      return res.json({ success: true, data: { fees: devSettingsCache.fees } });
    }
    let doc = await SiteSettings.findOne({ key: 'site' });
    if (!doc) {
      doc = await SiteSettings.create({ key: 'site' });
    }
    return res.json({ success: true, data: { fees: doc.fees || { commissionRate: 0.10, vatRate: 0.15 } } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

const updateFees = async (req, res) => {
  try {
    const payload = req.body || {};
    const fees = {
      commissionRate: Math.max(0, Math.min(1, Number(payload.commissionRate ?? 0.10))),
      vatRate: Math.max(0, Math.min(1, Number(payload.vatRate ?? 0.15)))
    };
    const connReady = !!(SiteSettings.db && SiteSettings.db.readyState === 1);
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (((process.env.NODE_ENV || 'development') !== 'production') && process.env.FORCE_DB_CONNECTION !== 'true') ||
      (ENABLE_DEV_MOCK_ON_FAILURE === 'true');
    if (!connReady && devFallbackEnabled) {
      devSettingsCache.fees = fees;
      return res.json({ success: true, data: { fees } });
    }
    const updated = await SiteSettings.findOneAndUpdate(
      { key: 'site' },
      { $set: { fees } },
      { upsert: true, new: true }
    );
    return res.json({ success: true, data: { fees: updated.fees } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

module.exports = { getHero, updateHero, getFees, updateFees };

// Currency settings
const getCurrencySettings = async (req, res) => {
  try {
    const connReady = !!(SiteSettings.db && SiteSettings.db.readyState === 1);
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (((process.env.NODE_ENV || 'development') !== 'production') && process.env.FORCE_DB_CONNECTION !== 'true') ||
      (ENABLE_DEV_MOCK_ON_FAILURE === 'true');
    if (!connReady && devFallbackEnabled) {
      return res.json({ success: true, data: { currency: { defaultCurrency: currencyService.baseCurrency } } });
    }
    let doc = await SiteSettings.findOne({ key: 'site' });
    if (!doc) doc = await SiteSettings.create({ key: 'site' });
    const curr = (doc.currency && doc.currency.defaultCurrency) ? doc.currency.defaultCurrency : 'USD';
    return res.json({ success: true, data: { currency: { defaultCurrency: curr } } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

const updateCurrencySettings = async (req, res) => {
  try {
    const { defaultCurrency } = req.body || {};
    const code = String(defaultCurrency || '').toUpperCase();
    // basic validation: use currencyService support list
    if (!currencyService.isSupportedCurrency(code)) {
      return res.status(400).json({ success: false, message: 'Unsupported currency code' });
    }
    const connReady = !!(SiteSettings.db && SiteSettings.db.readyState === 1);
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (((process.env.NODE_ENV || 'development') !== 'production') && process.env.FORCE_DB_CONNECTION !== 'true') ||
      (ENABLE_DEV_MOCK_ON_FAILURE === 'true');
    if (!connReady && devFallbackEnabled) {
      currencyService.baseCurrency = code;
      return res.json({ success: true, data: { currency: { defaultCurrency: code } } });
    }
    const updated = await SiteSettings.findOneAndUpdate(
      { key: 'site' },
      { $set: { currency: { defaultCurrency: code } } },
      { upsert: true, new: true }
    );
    // update in-memory base currency for conversions
    currencyService.baseCurrency = code;
    return res.json({ success: true, data: { currency: { defaultCurrency: updated.currency.defaultCurrency } } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

module.exports.getCurrencySettings = getCurrencySettings;
module.exports.updateCurrencySettings = updateCurrencySettings;