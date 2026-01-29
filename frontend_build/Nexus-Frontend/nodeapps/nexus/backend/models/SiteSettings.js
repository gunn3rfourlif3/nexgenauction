const mongoose = require('mongoose');

const ctaSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  link: { type: String, default: '' }
}, { _id: false });

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, default: '' }
}, { _id: false });

const heroSchema = new mongoose.Schema({
  title: { type: String, default: 'Welcome to Nexus Auctions' },
  subtitle: { type: String, default: 'Discover unique items, bid with confidence, and experience the future of online auctions' },
  theme: { type: String, default: 'default' },
  images: { type: [imageSchema], default: [] },
  primaryCta: { type: ctaSchema, default: () => ({ text: 'Browse Auctions', link: '/auctions' }) },
  secondaryCta: { type: ctaSchema, default: () => ({ text: 'Start Selling', link: '/create-auction' }) }
}, { _id: false });

const siteSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  hero: { type: heroSchema, default: () => ({}) },
  fees: {
    commissionRate: { type: Number, default: 0.10 },
    vatRate: { type: Number, default: 0.15 }
  },
  currency: {
    defaultCurrency: { type: String, default: 'USD' }
  }
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);