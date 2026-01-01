# Docker CSP Fix Guide

## 🎯 Problem
You're getting CSP violations when running the Docker deployment because the container was built with the old code that didn't have the CSP fixes.

## ✅ Solution
The CSP fixes are already applied to your local code, but Docker needs to rebuild the container with the updated files.

## 🚀 Quick Fix

### Option 1: Use the Rebuild Script (Recommended)

**For Windows PowerShell:**
```powershell
.\scripts\rebuild-with-csp-fix.ps1
```

**For Linux/Mac/WSL:**
```bash
chmod +x scripts/rebuild-with-csp-fix.sh
./scripts/rebuild-with-csp-fix.sh
```

### Option 2: Manual Docker Rebuild

1. **Stop existing containers:**
   ```bash
   docker compose -f docker-compose.ip.yml down
   ```

2. **Remove old images to force rebuild:**
   ```bash
   docker rmi $(docker images -q villain-seraphyx*)
   ```

3. **Rebuild without cache:**
   ```bash
   docker compose -f docker-compose.ip.yml build --no-cache
   ```

4. **Start containers:**
   ```bash
   docker compose -f docker-compose.ip.yml --profile monitoring up -d
   ```

## 🔍 Verification Steps

After rebuilding:

1. **Wait for containers to start** (about 30 seconds)

2. **Check container status:**
   ```bash
   docker compose -f docker-compose.ip.yml ps
   ```

3. **Test the dashboard:**
   - Visit: `http://43.129.55.161/dashboard`
   - Clear browser cache: `Ctrl+Shift+R`
   - Check browser console for CSP errors

4. **Check container logs if needed:**
   ```bash
   docker compose -f docker-compose.ip.yml logs -f discord-bot
   ```

## 🎉 Expected Result

After the rebuild, you should see:
- ✅ No CSP violation errors in browser console
- ✅ Tailwind CSS styles loading properly
- ✅ Font Awesome icons displaying
- ✅ Socket.IO connecting successfully
- ✅ Chart.js working for analytics

## 🔧 Troubleshooting

### If CSP errors persist:

1. **Verify the rebuild completed:**
   ```bash
   docker images | grep villain-seraphyx
   ```
   Should show a recent timestamp

2. **Check if the container is using the updated code:**
   ```bash
   docker exec villain-seraphyx-bot grep -n "scriptSrcAttr" /app/web/middleware/security.js
   ```
   Should return a line with `scriptSrcAttr`

3. **Force complete rebuild:**
   ```bash
   docker system prune -f
   docker compose -f docker-compose.ip.yml build --no-cache --pull
   ```

### If containers won't start:

1. **Check logs:**
   ```bash
   docker compose -f docker-compose.ip.yml logs
   ```

2. **Check disk space:**
   ```bash
   df -h
   ```

3. **Check Docker daemon:**
   ```bash
   docker info
   ```

## 📋 Management Commands

After successful deployment:

```bash
# View logs
docker compose -f docker-compose.ip.yml logs -f discord-bot

# Restart services
docker compose -f docker-compose.ip.yml restart

# Stop everything
docker compose -f docker-compose.ip.yml down

# Update and restart
docker compose -f docker-compose.ip.yml pull
docker compose -f docker-compose.ip.yml up -d
```

## 🌐 Access URLs

After successful deployment:
- **Dashboard:** http://43.129.55.161/dashboard
- **Health Check:** http://43.129.55.161/health
- **Portainer:** http://43.129.55.161:9000

## 🔒 Security Notes

The CSP configuration now allows:
- External CDN resources (Tailwind, Font Awesome, Socket.IO, Chart.js)
- Inline scripts and styles (with `unsafe-inline`)
- WebSocket connections for real-time features

This is a balanced approach between functionality and security for your Discord bot dashboard.

---

**Remember:** Always clear your browser cache after deploying updates!