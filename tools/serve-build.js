const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3100;
const BUILD_DIR = process.env.BUILD_DIR || path.resolve(__dirname, '..', 'frontend_build');
const USE_HTTPS = String(process.env.HTTPS || '').toLowerCase() === 'true';
const MIRROR_PROD = String(process.env.MIRROR_PROD || '').toLowerCase() === 'true';
const KEY_PATH = process.env.KEY_PATH || '';
const CERT_PATH = process.env.CERT_PATH || '';
const PFX_PATH = process.env.PFX_PATH || '';
const PFX_PASS = process.env.PFX_PASS || '';
const DISABLE_ASSISTANT_WIDGET = String(process.env.DISABLE_ASSISTANT_WIDGET || 'true').toLowerCase() === 'true';

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    let payload = data;
    if (!DISABLE_ASSISTANT_WIDGET && !MIRROR_PROD && contentType === 'text/html' && /index\.html$/i.test(filePath)) {
      payload = injectAssistantWidget(payload);
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(payload);
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

function selectProxyBase(urlPath) {
  if (/^\/api\/assistant/.test(urlPath)) {
    return process.env.LOCAL_ASSISTANT_BASE || 'http://localhost:5006';
  }
  return process.env.PROD_API_BASE || 'https://www.zaaka.co.za';
}

function proxyRequest(req, res) {
  const base = selectProxyBase(req.url);
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
  if (MIRROR_PROD) {
    return proxyRequest(req, res);
  }
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  if (/^\/api\/assistant/.test(reqPath)) {
    return handleAssistant(req, res);
  }
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

function handleAssistant(req, res) {
  if (req.method !== 'POST' || !/\/query$/.test(req.url)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Not found' }));
    return;
  }
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const json = body ? JSON.parse(body) : {};
      const message = String(json.message || '').trim();
      const key = process.env.OPENAI_API_KEY || '';
      const fallback = () => {
        const t = message.toLowerCase();
        if (/register/.test(t)) return 'Create an account, verify email, complete your profile, then register participation.';
        if (/verify/.test(t)) return 'Click the link in your verification email; resend from Profile → Security.';
        if (/deposit/.test(t)) return 'View bank details on the auction page, use your reference, upload the receipt.';
        if (/fees|vat|stc/.test(t)) return 'Buyer’s commission, platform fee, VAT/STC may apply. Totals shown at checkout and on invoices.';
        if (/participation/.test(t)) return 'Register participation per auction, then bid.';
        if (/prepare|lots/.test(t)) return 'Prepare lots with clear photos, accurate descriptions, condition report, and reserve if applicable.';
        return 'I can help with registration, verification, deposits, fees/VAT/STC, participation and preparing lots.';
      };
      if (!key) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: { reply: fallback() } }));
        return;
      }
      const payload = JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are Nexus Auctions assistant. Be concise and specific.' },
          { role: 'user', content: message }
        ],
        temperature: 0.2
      });
      const opts = {
        method: 'POST',
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const reqOpenAI = https.request(opts, (r) => {
        let data = '';
        r.on('data', (c) => { data += c; });
        r.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const reply = parsed?.choices?.[0]?.message?.content || fallback();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: { reply } }));
          } catch {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: { reply: fallback() } }));
          }
        });
      });
      reqOpenAI.on('error', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: { reply: fallback() } }));
      });
      reqOpenAI.write(payload);
      reqOpenAI.end();
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { reply: 'Network error. Please try again.' } }));
    }
  });
}

function injectAssistantWidget(html) {
  if (html.includes('id="nexus-assistant-root"')) return html;
  const script = `
<div id="nexus-assistant-root" style="position:fixed;right:20px;bottom:20px;z-index:99999;">
  <button id="nexus-assistant-toggle" style="background:#000;color:#fff;border:none;border-radius:999px;width:56px;height:56px;box-shadow:0 6px 16px rgba(0,0,0,.25);cursor:pointer;">AI</button>
  <div id="nexus-assistant-panel" style="display:none;position:absolute;right:0;bottom:70px;width:320px;max-height:420px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;box-shadow:0 12px 24px rgba(0,0,0,.2);overflow:hidden;">
    <div style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08);font-weight:600;">Assistant</div>
    <div id="nexus-assistant-messages" style="padding:10px;overflow:auto;height:300px;font-size:14px;line-height:1.4;"></div>
    <form id="nexus-assistant-form" style="display:flex;border-top:1px solid rgba(0,0,0,.08);">
      <input id="nexus-assistant-input" type="text" placeholder="Type a question..." style="flex:1;padding:10px;border:none;outline:none;font-size:14px;">
      <button type="submit" style="background:#000;color:#fff;border:none;padding:0 14px;">Send</button>
    </form>
  </div>
</div>
<script>
(function(){
  var toggle = document.getElementById('nexus-assistant-toggle');
  var panel = document.getElementById('nexus-assistant-panel');
  var form = document.getElementById('nexus-assistant-form');
  var input = document.getElementById('nexus-assistant-input');
  var messages = document.getElementById('nexus-assistant-messages');
  function addMsg(text, who){
    var d = document.createElement('div');
    d.style.margin = '6px 0';
    d.style.whiteSpace = 'pre-wrap';
    d.textContent = (who === 'me' ? 'You: ' : 'Assistant: ') + text;
    messages.appendChild(d);
    messages.scrollTop = messages.scrollHeight;
  }
  toggle.addEventListener('click', function(){
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var msg = String(input.value || '').trim();
    if(!msg) return;
    addMsg(msg, 'me');
    input.value = '';
    fetch('/api/assistant/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    }).then(function(r){ return r.json(); })
      .then(function(j){
        var reply = (j && j.data && j.data.reply) || 'No reply';
        addMsg(reply, 'bot');
      }).catch(function(){
        addMsg('Network error. Please try again.', 'bot');
      });
  });
})();
</script>
`;
  return String(html).replace(/<\/body>\s*<\/html>\s*$/i, script + '</body></html>');
}
