const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3100;
const BUILD_DIR = process.env.BUILD_DIR || path.resolve(__dirname, '..', 'frontend_build');
const USE_HTTPS = String(process.env.HTTPS || '').toLowerCase() === 'true';
const KEY_PATH = process.env.KEY_PATH || '';
const CERT_PATH = process.env.CERT_PATH || '';
const PFX_PATH = process.env.PFX_PATH || '';
const PFX_PASS = process.env.PFX_PASS || '';

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.js': return 'application/javascript';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    case '.map': return 'application/json';
    default: return 'application/octet-stream';
  }
}

function proxyRequest(req, res) {
  const base = process.env.PROD_API_BASE || 'https://www.zaaka.co.za';
  const target = new URL(base + req.url);
  const mod = target.protocol === 'https:' ? https : http;
  const options = {
    method: req.method,
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    headers: { ...req.headers, host: target.host }
  };
  const prox = mod.request(options, (pr) => {
    const headers = { ...pr.headers };
    // If serving over HTTP (not HTTPS), relax cookies so they can be set locally.
    // If serving over HTTPS, mirror production cookies exactly.
    if (!USE_HTTPS) {
      const setCookie = headers['set-cookie'];
      if (Array.isArray(setCookie)) {
        headers['set-cookie'] = setCookie.map((c) => {
          return String(c)
            .replace(/;?\s*Domain=[^;]*/ig, '')
            .replace(/;?\s*Secure/ig, '')
            .replace(/SameSite=None/ig, 'SameSite=Lax');
        });
      }
    }
    res.writeHead(pr.statusCode || 502, headers);
    pr.pipe(res);
  });
  prox.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad gateway');
  });
  req.pipe(prox);
}

function requestHandler(req, res) {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  if (/^\/(api|socket\.io)/.test(reqPath)) {
    return proxyRequest(req, res);
  }

  const filePath = path.join(BUILD_DIR, reqPath);
  const contentType = getContentType(filePath);

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      sendFile(res, filePath, contentType);
    } else {
      const indexPath = path.join(BUILD_DIR, 'index.html');
      sendFile(res, indexPath, 'text/html');
    }
  });
}

let server;
if (USE_HTTPS) {
  let tlsOptions = {};
  if (PFX_PATH && fs.existsSync(PFX_PATH)) {
    tlsOptions.pfx = fs.readFileSync(PFX_PATH);
    if (PFX_PASS) tlsOptions.passphrase = PFX_PASS;
  } else if (KEY_PATH && CERT_PATH && fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
    tlsOptions.key = fs.readFileSync(KEY_PATH);
    tlsOptions.cert = fs.readFileSync(CERT_PATH);
  } else {
    console.warn('HTTPS requested but no valid cert provided. Falling back to HTTP.');
    server = http.createServer(requestHandler);
  }
  if (!server) {
    server = https.createServer(tlsOptions, requestHandler);
  }
} else {
  server = http.createServer(requestHandler);
}

server.listen(PORT, () => {
  const proto = USE_HTTPS ? 'https' : 'http';
  console.log(`Static server running at ${proto}://localhost:${PORT}/ serving ${BUILD_DIR}`);
}); 
