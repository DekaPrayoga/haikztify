#!/bin/bash
set -e

echo "============================================="
echo "  HaikZTIFY VPS Deploy Script"
echo "  Backend API → api.haikz.me"
echo "============================================="
echo ""

BACKEND_DIR="/root/main/spotify-clone-react/backend"
NGINX_CONF="$BACKEND_DIR/nginx-api.conf"

# ─── Step 1: Kill old processes on port 3001/5173 ───
echo "🔪 [1/6] Killing old processes..."
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 1
echo "   ✅ Ports cleared"

# ─── Step 2: Install nginx + certbot if needed ───
echo ""
echo "📦 [2/6] Installing nginx & certbot..."
if ! command -v nginx &>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq nginx certbot python3-certbot-nginx
    echo "   ✅ nginx + certbot installed"
else
    echo "   ✅ nginx already installed"
fi

# ─── Step 3: Setup nginx reverse proxy ───
echo ""
echo "🔧 [3/6] Configuring nginx for api.haikz.me..."
cp "$NGINX_CONF" /etc/nginx/sites-available/api.haikz.me
ln -sf /etc/nginx/sites-available/api.haikz.me /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx
echo "   ✅ nginx configured & running"

# ─── Step 4: Start backend with PM2 ───
echo ""
echo "🚀 [4/6] Starting backend with PM2..."
cd "$BACKEND_DIR"
npm install --production

# Stop old PM2 process if exists
pm2 delete haikztify-api 2>/dev/null || true

# Start with ecosystem config
pm2 start ecosystem.config.cjs
pm2 save

# Auto-start on boot
pm2 startup systemd -u root --hp /root 2>/dev/null || true
echo "   ✅ Backend running on port 3001"

# ─── Step 5: SSL with Let's Encrypt ───
echo ""
echo "🔒 [5/6] Setting up SSL..."
echo ""
echo "⚠️  BEFORE THIS: Make sure DNS A record exists:"
echo "   api.haikz.me → 188.166.240.31"
echo ""
read -p "   DNS sudah di-set? (y/n): " dns_ready

if [ "$dns_ready" = "y" ] || [ "$dns_ready" = "Y" ]; then
    certbot --nginx -d api.haikz.me --non-interactive --agree-tos --email admin@haikz.me --redirect 2>&1 || {
        echo "   ⚠️  Certbot failed. DNS mungkin belum propagate."
        echo "   Run manually later: certbot --nginx -d api.haikz.me"
    }
    echo "   ✅ SSL configured"
else
    echo "   ⏭️  Skipped SSL. Run later:"
    echo "      certbot --nginx -d api.haikz.me"
fi

# ─── Step 6: Verify ───
echo ""
echo "🧪 [6/6] Verifying..."
sleep 2
HEALTH=$(curl -s http://localhost:3001/api/health)
echo "   Local: $HEALTH"

API_HEALTH=$(curl -s http://api.haikz.me/api/health 2>/dev/null || echo "DNS not ready yet")
echo "   Public: $API_HEALTH"

echo ""
echo "============================================="
echo "  ✅ DEPLOY COMPLETE!"
echo "============================================="
echo ""
echo "  Backend: http://localhost:3001"
echo "  Public:  https://api.haikz.me"
echo ""
echo "  PM2 status: pm2 status"
echo "  PM2 logs:   pm2 logs haikztify-api"
echo "  PM2 restart: pm2 restart haikztify-api"
echo ""
echo "  Next: Deploy frontend to Vercel"
echo "    → Set env var VITE_API_URL=https://api.haikz.me"
echo "============================================="
