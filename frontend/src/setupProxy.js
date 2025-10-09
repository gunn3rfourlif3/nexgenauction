const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const target = process.env.REACT_APP_DEV_PROXY_TARGET || 'http://127.0.0.1:5006';

  // Proxy REST API
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'warn',
      pathRewrite: (path, req) => {
        // CRA mounts proxy at '/api', Express strips the prefix; re-add it
        return path.startsWith('/api') ? path : `/api${path}`;
      }
    })
  );

  // Proxy Socket.IO (Engine.IO) with WebSocket upgrades
  app.use(
    /^\/socket\.io\/?.*/,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      logLevel: 'debug',
      // Ensure proper headers for upgrade
      onProxyReq: (proxyReq, req) => {
        if (req.headers.origin) {
          proxyReq.setHeader('origin', req.headers.origin);
        }
      },
      pathRewrite: (path) => (path.startsWith('/socket.io') ? path : `/socket.io${path}`)
    })
  );
};