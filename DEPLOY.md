# 🚀 HaikZTIFY Deploy Guide

## Architecture
```
┌─────────────────┐         ┌──────────────────────┐
│   haikz.me      │         │   api.haikz.me       │
│   (Vercel)      │ ──API── │   (VPS 188.166.240.31) │
│                 │         │                      │
│   React SPA     │         │   Express + yt-dlp   │
│   Static CDN    │         │   PM2 managed        │
│   FREE          │         │   nginx + SSL        │
└─────────────────┘         └──────────────────────┘
```

## Step 1: DNS Setup (di domain registrar)

Add these DNS records:
| Type | Name | Value | Note |
|------|------|-------|------|
| A | `api` | `188.166.240.31` | VPS backend |
| CNAME | `@` / kosong | `cname.vercel-dns.com` | Vercel frontend |

> ⚠️ Kalau `haikz.me` udah pointing ke GitHub Pages, ubah ke Vercel CNAME.

## Step 2: Deploy Backend ke VPS

```bash
cd /root/main/spotify-clone-react
./deploy-vps.sh
```

Script ini otomatis:
1. Kill old processes
2. Install nginx + certbot
3. Setup reverse proxy (api.haikz.me → localhost:3001)
4. Start backend dengan PM2 (memory limited 256MB)
5. Setup SSL via Let's Encrypt

### Manual commands kalau perlu:
```bash
# Restart backend
pm2 restart haikztify-api

# Check logs
pm2 logs haikztify-api

# Check status
pm2 status

# SSL manual
certbot --nginx -d api.haikz.me
```

## Step 3: Deploy Frontend ke Vercel

### Option A: Via Vercel CLI
```bash
cd /root/main/spotify-clone-react/frontend
npx vercel --prod
```

### Option B: Via GitHub → Vercel Dashboard
1. Push repo ke GitHub
2. Buka vercel.com → Import Project
3. Set **Root Directory**: `frontend`
4. Set **Framework Preset**: Vite
5. Set **Environment Variable**:
   - `VITE_API_URL` = `https://api.haikz.me`
6. Deploy

### Option C: Manual build + upload
```bash
cd /root/main/spotify-clone-react/frontend
npm install
npm run build
# Upload dist/ folder to Vercel
npx vercel deploy dist/ --prod
```

## Step 4: Add Domain di Vercel
1. Vercel Dashboard → Project Settings → Domains
2. Add `haikz.me`
3. Follow DNS instructions

## Step 5: Update Spotify App Settings
Di [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):
1. Edit your app
2. **Redirect URIs**: add `https://api.haikz.me/auth/callback`
3. **Website**: `https://haikz.me`
4. Save

## 📊 Resource Usage di VPS
| Component | RAM | CPU |
|-----------|-----|-----|
| Backend (PM2) | ~50-150MB | Low (idle) |
| nginx | ~5MB | Negligible |
| yt-dlp (per request) | ~30MB spike | Medium (15s max) |
| **Total** | **~100-200MB** | **Minimal** |

Jauh lebih ringan daripada serve frontend + backend semua di VPS!

## 🔧 Troubleshoot

### Backend gak jalan
```bash
pm2 logs haikztify-api --lines 50
# Check .env
cat /root/main/spotify-clone-react/backend/.env
```

### CORS error di browser
Check backend `.env` → `FRONTEND_URL=https://haikz.me`

### SSL certificate expired
```bash
certbot renew
systemctl reload nginx
```

### yt-dlp gak nemu audio
```bash
yt-dlp --update
# Test manual:
yt-dlp -f bestaudio -g "scsearch1:dewa 19 kangen"
```
