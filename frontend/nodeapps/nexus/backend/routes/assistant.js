const express = require('express');
const router = express.Router();
const axios = require('axios');

const bucket = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 15;

function isRateLimited(key) {
  const now = Date.now();
  const entry = bucket.get(key) || { count: 0, reset: now + WINDOW_MS };
  if (now > entry.reset) {
    bucket.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  bucket.set(key, entry);
  return entry.count > MAX_PER_WINDOW;
}

function fallbackAnswer(q) {
  const t = String(q || '').toLowerCase();
  if (/register/.test(t)) return 'To register, create an account, verify your email, then complete your profile.';
  if (/verify/.test(t)) return 'Open your verification email and click the link. You can resend from Profile → Security.';
  if (/deposit/.test(t)) return 'Deposits: view bank details on the auction page. Use the payment reference shown, then upload your receipt.';
  if (/fees|vat/.test(t)) return 'Fees: buyer’s commission, platform fee, and VAT/STC may apply. Totals are shown at checkout and on invoices.';
  if (/participation/.test(t)) return 'Register participation per auction via the Register button. Refunds are processed after settlement as per policy.';
  if (/prepare|lots/.test(t)) return 'Preparing lots: add clear photos, accurate descriptions, condition report, and reserve price if applicable.';
  return 'I can help with registration, verification, deposits, fees/VAT/STC, participation and preparing lots.';
}

router.post('/query', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
    if (isRateLimited(ip)) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please wait a moment.' });
    }
    const message = (req.body && req.body.message) || '';
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      return res.json({ success: true, data: { reply: fallbackAnswer(message) } });
    }

    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are Nexus Auctions assistant. Be concise and specific.' },
        { role: 'user', content: String(message || '') }
      ],
      temperature: 0.2,
    };

    try {
      const r = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });
      const reply = r.data?.choices?.[0]?.message?.content || fallbackAnswer(message);
      return res.json({ success: true, data: { reply } });
    } catch (apiErr) {
      return res.json({ success: true, data: { reply: fallbackAnswer(message) } });
    }
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Assistant error' });
  }
});

module.exports = router;
