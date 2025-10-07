let express;
try {
  // Prefer root-level express if installed
  express = require('express');
} catch (e) {
  // Fallback to backend's express dependency
  const backendExpressPath = require('path').join(__dirname, 'backend', 'node_modules', 'express');
  // eslint-disable-next-line import/no-dynamic-require
  express = require(backendExpressPath);
}
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PREVIEW_PORT || 3000;
const BACKEND_PORT = process.env.BACKEND_PORT || 5006;
// Prefer 127.0.0.1 to avoid any localhost resolution quirks
const BACKEND_URL = process.env.BACKEND_URL || `http://127.0.0.1:${BACKEND_PORT}`;

// Lightweight API proxy to backend for development
app.use('/api', (req, res) => {
  const targetUrl = BACKEND_URL + req.originalUrl;
  console.log(`[PreviewProxy] ${req.method} ${req.originalUrl} -> ${targetUrl}`);
  const urlObj = new URL(targetUrl);
  const isHttps = urlObj.protocol === 'https:';
  const client = isHttps ? https : http;
  const headers = { ...req.headers };
  // Do not forward incoming host header; let Node set correctly
  delete headers.host;

  const requestOptions = {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: req.method,
    headers
  };

  const proxyReq = client.request(requestOptions, (proxyRes) => {
    console.log(`[PreviewProxy] <- ${proxyRes.statusCode} ${req.originalUrl}`);
    res.status(proxyRes.statusCode || 500);
    // Forward response headers
    Object.entries(proxyRes.headers || {}).forEach(([key, value]) => {
      if (typeof value !== 'undefined') {
        res.setHeader(key, value);
      }
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    const msg = (err && (err.code || err.message)) || 'Unknown error';
    console.error('[PreviewProxy] error:', msg, err);
    res.status(502).json({ success: false, message: 'Preview proxy error', error: msg });
  });

  if (req.readable && req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
});

// Serve frontend build assets first if present
const buildDir = path.join(__dirname, 'frontend', 'build');
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
}

// Then serve static preview assets
app.use(express.static(path.join(__dirname, 'preview')));

// Fallback to index.html for client-side routes
// Wildcard route - use regex to match anything
app.get(/.*/, (req, res) => {
  const previewIndex = path.join(__dirname, 'preview', 'index.html');
  const buildIndex = path.join(__dirname, 'frontend', 'build', 'index.html');
  if (fs.existsSync(buildIndex)) {
    return res.sendFile(buildIndex);
  }
  return res.sendFile(previewIndex);
});

app.listen(PORT, () => {
  console.log(`Preview server running on http://localhost:${PORT}`);
});