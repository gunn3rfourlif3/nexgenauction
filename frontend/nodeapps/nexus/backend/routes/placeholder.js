const express = require('express');
const router = express.Router();
const axios = require('axios');

// Simple SVG placeholder generator for development and fallbacks
// Usage: /api/placeholder/:width/:height?bg=%23hex&fg=%23hex&text=Your+Text
router.get('/:width/:height', (req, res) => {
  const clamp = (n, min, max) => Math.max(min, Math.min(n, max));
  const width = clamp(parseInt(req.params.width, 10) || 400, 50, 4000);
  const height = clamp(parseInt(req.params.height, 10) || 300, 50, 4000);

  const bg = String(req.query.bg || '#1f2937'); // tailwind gray-800
  const fg = String(req.query.fg || '#e5e7eb'); // tailwind gray-200
  const text = String(req.query.text || `${width}×${height}`);

  const fontSize = Math.floor(Math.min(width, height) / 6);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${bg};stop-opacity:0.9" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="${fg}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="${fontSize}" font-weight="600">${text}</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // cache for 1 day
  res.status(200).send(svg);
});

module.exports = router;

// Remote image proxy with content-type validation and basic safeguards
// Usage: /api/placeholder/proxy?url=https%3A%2F%2Fhost%2Fpath
router.get('/proxy', async (req, res) => {
  try {
    const raw = String(req.query.url || '').trim();
    if (!raw) return res.status(400).json({ success: false, message: 'Missing url' });
    let url;
    try {
      url = new URL(raw);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid url' });
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return res.status(400).json({ success: false, message: 'Unsupported scheme' });
    }
    // Disallow localhost/loopback/internal addresses
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      return res.status(400).json({ success: false, message: 'Blocked host' });
    }
    const response = await axios.get(url.toString(), {
      responseType: 'arraybuffer',
      timeout: 8000,
      maxContentLength: 5 * 1024 * 1024, // 5MB
      headers: {
        'User-Agent': 'NexGenAuctionImageProxy/1.0 (+https://www.zaaka.co.za)'
      }
    });
    const ctype = String(response.headers['content-type'] || '').toLowerCase();
    if (!ctype.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'URL is not an image' });
    }
    res.setHeader('Content-Type', ctype);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(Buffer.from(response.data));
  } catch (e) {
    return res.status(502).json({ success: false, message: 'Failed to fetch remote image' });
  }
});