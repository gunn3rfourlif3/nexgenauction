# Deployment Guide for www.zaaka.co.za (cPanel / HostAfrica)

## Prerequisites
- cPanel hosting on HostAfrica with “Setup Node.js App” (Phusion Passenger)
- Node.js 18 available in cPanel
- Domain `zaaka.co.za` with `www` pointed to your cPanel host
- MongoDB Atlas project and database user

## 1) Frontend (React)
- Ensure `frontend/package.json` contains `"homepage": "https://www.zaaka.co.za"`.
- Build locally:
  - `cd frontend`
  - `npm ci`
  - `npm run build`
- Upload the contents of `frontend/build/` directly into your main domain docroot, typically `public_html/`.
- Add `.htaccess` in `public_html/`:
```
RewriteEngine On
RewriteBase /

# Canonicalize to www (optional)
RewriteCond %{HTTP_HOST} !^www\.zaaka\.co\.za$ [NC]
RewriteRule ^(.*)$ https://www.zaaka.co.za/$1 [L,R=301]

# Do NOT rewrite API or WebSocket paths
RewriteCond %{REQUEST_URI} ^/api/ [OR]
RewriteCond %{REQUEST_URI} ^/socket.io/
RewriteRule .* - [L]

# Normal SPA rewrite for non-file/non-dir
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

## 2) Backend (Node.js App)
- Upload the `backend/` folder to a directory under your account, e.g. `~/nodeapps/nexgenauction/backend`.
- In cPanel → Setup Node.js App → Create Application:
  - Domain: `www.zaaka.co.za`
  - Application URL: `/api`
  - Application Root: path to `backend` you uploaded
  - Startup file: `server.js`
  - Node.js version: 18.x
- Click “Create” then “NPM Install”.
- Set Environment Variables:
  - `NODE_ENV=production`
  - `MONGODB_URI=<your Atlas SRV string>`
  - `JWT_SECRET=<strong 32+ char secret>`
  - `JWT_EXPIRE=7d`
  - `FRONTEND_URL=https://www.zaaka.co.za`
  - Optional: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- Click “Restart App”. Passenger will proxy `/api` to your Node backend.

Notes:
- Your backend must listen on `process.env.PORT` (your `server.js` already uses `process.env.PORT` OR `BACKEND_PORT`). Passenger provides the port.
- With Application URL `/api`, frontend requests to `/api/...` go to the Node app.

## 3) SSL
- In cPanel, run AutoSSL for `zaaka.co.za` and `www.zaaka.co.za`.

## 4) Verification
- Open `https://www.zaaka.co.za` (no console errors).
- API health: `https://www.zaaka.co.za/api/health` returns JSON.
- API status: `https://www.zaaka.co.za/api/status` returns JSON.
- WebSocket handshake connects: `wss://www.zaaka.co.za/socket.io/`.

## 5) Troubleshooting
- 404 on API requests:
  - Ensure `.htaccess` excludes `/api` and `/socket.io` from SPA rewrite.
  - Confirm Node.js App Application URL is exactly `/api`.
- 500/503 errors:
  - cPanel → Node.js App → “Errors” and “Restart App”.
  - Re-run “NPM Install” after backend changes.
- CORS issues:
  - Verify `FRONTEND_URL=https://www.zaaka.co.za` in backend env and restart app.
- MongoDB connection errors:
  - Whitelist your server IP in Atlas and verify credentials.

## 6) Maintenance
- Frontend updates: rebuild locally and re-upload `build/` contents to `public_html/`.
- Backend updates: upload changes, run “NPM Install” if needed, then “Restart App”.
- Keep secrets out of Git; prefer cPanel environment variables for sensitive values.