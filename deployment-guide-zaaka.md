# Deployment Guide for zaaka.co.za

## Server Requirements
- Ubuntu 20.04+ LTS or similar Linux distribution
- Node.js 18+ LTS
- MongoDB Atlas account (recommended) or self-hosted MongoDB
- Domain: zaaka.co.za (DNS configured to point to your server)
- SSL Certificate (Let's Encrypt recommended)

## Step 1: Server Preparation

### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install additional tools
sudo apt install -y git nginx certbot python3-certbot-nginx build-essential

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x or higher
```

## Step 2: Application Setup

### Clone and Install
```bash
# Create application directory
sudo mkdir -p /var/www/zaaka
sudo chown $USER:$USER /var/www/zaaka

# Clone repository
cd /var/www/zaaka
git clone <your-repo-url> .

# Install backend dependencies
cd backend
npm ci --production

# Install frontend dependencies and build
cd ../frontend
npm ci
npm run build
```

### Environment Configuration
```bash
# Copy production environment file
cd /var/www/zaaka/backend
cp .env.production .env

# Edit with your actual values
nano .env
```

**Required .env values to update:**
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: Generate a strong 32+ character secret
- `EMAIL_USER` & `EMAIL_PASS`: Your email credentials
- `STRIPE_SECRET_KEY` & `STRIPE_PUBLISHABLE_KEY`: If using Stripe

## Step 3: MongoDB Setup (Atlas Recommended)

### MongoDB Atlas
1. Create account at https://cloud.mongodb.com
2. Create new project: "NexGenAuction"
3. Create cluster (free tier available)
4. Create database user with read/write permissions
5. Whitelist your server IP address
6. Get connection string and update `MONGODB_URI` in .env

### Connection String Format:
```
mongodb+srv://username:password@cluster.mongodb.net/nexgenauction?retryWrites=true&w=majority&appName=NexGenAuction
```

## Step 4: Start Application with PM2

```bash
cd /var/www/zaaka/backend

# Start application
pm2 start server.js --name "zaaka-backend" --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above

# Check status
pm2 status
pm2 logs zaaka-backend
```

## Step 5: Nginx Configuration

### Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/zaaka.co.za
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name zaaka.co.za www.zaaka.co.za;
    
    # Redirect HTTP to HTTPS (will be configured by Certbot)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name zaaka.co.za www.zaaka.co.za;
    
    # SSL certificates (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/zaaka.co.za/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/zaaka.co.za/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # File upload size limit
    client_max_body_size 10M;
    
    # Main application proxy
    location / {
        proxy_pass http://127.0.0.1:5007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # API routes (explicit for better performance)
    location /api/ {
        proxy_pass http://127.0.0.1:5007/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.IO WebSocket support
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5007/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable Site and Test Configuration
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/zaaka.co.za /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 6: SSL Certificate with Let's Encrypt

```bash
# Install SSL certificate
sudo certbot --nginx -d zaaka.co.za -d www.zaaka.co.za

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)

# Test auto-renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

## Step 7: Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Check status
sudo ufw status
```

## Step 8: Final Verification

### Test Backend Health
```bash
curl -k https://zaaka.co.za/api/health
curl -k https://zaaka.co.za/api/status
```

### Test Frontend
- Open https://zaaka.co.za in browser
- Check browser console for errors
- Test user registration/login
- Verify WebSocket connections work

### Monitor Logs
```bash
# PM2 logs
pm2 logs zaaka-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

## Step 9: Maintenance Commands

### Update Application
```bash
cd /var/www/zaaka
git pull origin main

# Update backend
cd backend
npm ci --production
pm2 restart zaaka-backend

# Update frontend
cd ../frontend
npm ci
npm run build
```

### Backup Database (if self-hosted)
```bash
# MongoDB backup
mongodump --uri="your_mongodb_uri" --out=/backup/$(date +%Y%m%d)
```

### SSL Certificate Renewal (automatic)
```bash
# Certbot auto-renewal is configured by default
# Manual renewal if needed:
sudo certbot renew
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if PM2 process is running: `pm2 status`
   - Check backend logs: `pm2 logs zaaka-backend`
   - Verify port 5007 is listening: `sudo netstat -tlnp | grep 5007`

2. **CORS Errors**
   - Ensure `FRONTEND_URL=https://zaaka.co.za` in backend .env
   - Restart backend: `pm2 restart zaaka-backend`

3. **SSL Issues**
   - Check certificate: `sudo certbot certificates`
   - Renew if needed: `sudo certbot renew`

4. **Database Connection**
   - Verify MongoDB URI in .env
   - Check IP whitelist in MongoDB Atlas
   - Test connection: `node -e "require('./config/database')()"`

### Performance Optimization

1. **Enable Gzip in Nginx**
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   ```

2. **PM2 Cluster Mode**
   ```bash
   pm2 start server.js --name "zaaka-backend" --instances max --env production
   ```

3. **MongoDB Indexing**
   - Ensure proper indexes are created for frequently queried fields
   - Monitor slow queries in MongoDB Atlas

## Security Checklist

- ✅ SSL certificate installed and auto-renewal configured
- ✅ Firewall configured (UFW)
- ✅ Strong JWT secret (32+ characters)
- ✅ MongoDB authentication enabled
- ✅ CORS properly configured
- ✅ Security headers in Nginx
- ✅ File upload size limits
- ✅ Regular security updates scheduled

## Support

For issues specific to zaaka.co.za deployment:
1. Check PM2 logs: `pm2 logs zaaka-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify DNS: `nslookup zaaka.co.za`
4. Test SSL: `openssl s_client -connect zaaka.co.za:443`