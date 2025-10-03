const http = require('http');
const fs = require('fs');
const path = require('path');

const cliPort = parseInt(process.argv[2] || '', 10);
const PORT = (Number.isInteger(cliPort) && cliPort > 0 ? cliPort : (process.env.PORT ? parseInt(process.env.PORT, 10) : 5500));
const previewDir = path.join(__dirname, '..', 'preview');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'text/plain; charset=utf-8';
  }
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(previewDir, urlPath);

  // Default to index.html for root or missing files
  if (urlPath === '/' || !fs.existsSync(filePath)) {
    filePath = path.join(previewDir, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`Preview server running at ${url}`);
});