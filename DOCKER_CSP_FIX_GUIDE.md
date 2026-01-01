# Docker CSP Fix Guide - VPS Linux

## 🐳 Your Docker Setup
You're running on VPS Linux with Docker Compose. The CSP fixes are ready in the code, but Docker containers need to be rebuilt to pick up the changes.

## 🚀 Quick Fix Commands

### Option 1: Full Rebuild (Recommended)
```bash
# Stop and remove containers
docker-compose down

# Rebuild with no cache to ensure CSP fixes are included
docker-compose build --no-cache

# Start containers
docker-compose up -d

# Check status
docker-compose ps
```

### Option 2: Restart Existing Container
```bash
# Just restart (if you're sure the image has the fixes)
docker-compose restart

# Or stop and start
docker-compose stop
docker-compose start
```

### Option 3: Manual Docker Commands
```bash
# Stop container
docker stop villain-seraphyx-bot

# Remove container
docker rm villain-seraphyx-bot

# Rebuild image
docker build -t villain-seraphyx-bot --no-cache .

# Run new container
docker run -d --name villain-seraphyx-bot \
  --env-file .env \
  -p 3000:3000 -p 3001:3001 \
  --restart unless-stopped \
  villain-seraphyx-bot
```

## 🔍 Verify the Fix

### 1. Check Container Status
```bash
docker-compose ps
# Should show container as "Up"
```

### 2. Check Container Logs
```bash
docker-compose logs -f
# Look for: "[Security] Applying FIXED CSP configuration for external resources"
```

### 3. Test CSP Headers
```bash
# Test from your VPS
curl -I http://localhost:3001/dashboard | grep -i content-security-policy

# Should show CSP with style-src-elem and script-src-elem
```

### 4. Test Health Endpoint
```bash
curl http://localhost:3001/health
# Should return JSON with status: "ok"
```

## 🌐 Access Your Dashboard

After restart, access your dashboard at:
```
http://YOUR_VPS_IP:3001/dashboard
```

**Important**: Clear your browser cache (`Ctrl+Shift+R`) before testing!

## 🔧 Troubleshooting

### If CSP Violations Still Occur:

1. **Verify Container Rebuilt**
   ```bash
   docker images | grep villain-seraphyx-bot
   # Check the "Created" timestamp - should be recent
   ```

2. **Check Container Logs**
   ```bash
   docker-compose logs | grep -i security
   # Should see: "Applying FIXED CSP configuration"
   ```

3. **Verify CSP Header**
   ```bash
   curl -I http://localhost:3001/dashboard 2>/dev/null | grep -i content-security-policy
   ```

4. **Test from Browser DevTools**
   - Open dashboard in browser
   - F12 → Network tab
   - Refresh page
   - Click on main document request
   - Check Response Headers for `Content-Security-Policy`
   - Should include `style-src-elem` and `script-src-elem`

### If Container Won't Start:

1. **Check Logs**
   ```bash
   docker-compose logs
   ```

2. **Check Environment Variables**
   ```bash
   docker-compose config
   ```

3. **Verify .env File**
   ```bash
   ls -la .env
   cat .env | grep -v "TOKEN\|SECRET"  # Don't show sensitive data
   ```

### If Port Issues:

1. **Check Port Binding**
   ```bash
   docker-compose ps
   netstat -tlnp | grep :3001
   ```

2. **Check Firewall**
   ```bash
   # Ubuntu/Debian
   sudo ufw status
   sudo ufw allow 3001
   
   # CentOS/RHEL
   sudo firewall-cmd --list-ports
   sudo firewall-cmd --add-port=3001/tcp --permanent
   sudo firewall-cmd --reload
   ```

## 📋 Complete Restart Script

Save this as `restart-csp-fix.sh`:

```bash
#!/bin/bash
echo "🐳 Restarting Docker with CSP fixes..."

# Stop containers
echo "Stopping containers..."
docker-compose down

# Rebuild with no cache
echo "Rebuilding image..."
docker-compose build --no-cache

# Start containers
echo "Starting containers..."
docker-compose up -d

# Wait for startup
echo "Waiting for services..."
sleep 10

# Test health
echo "Testing health endpoint..."
curl -s http://localhost:3001/health | jq . || echo "Health check failed"

# Test CSP
echo "Testing CSP headers..."
CSP=$(curl -s -I http://localhost:3001/dashboard | grep -i content-security-policy)
if [[ $CSP == *"style-src-elem"* ]]; then
    echo "✅ CSP fix applied successfully!"
else
    echo "❌ CSP fix may not be applied"
fi

echo "✨ Restart complete!"
echo "🌐 Dashboard: http://$(curl -s ifconfig.me):3001/dashboard"
```

Make it executable and run:
```bash
chmod +x restart-csp-fix.sh
./restart-csp-fix.sh
```

## 🎯 Expected Result

After the Docker restart:
- ✅ No CSP violation errors in browser console
- ✅ Tailwind CSS styles load properly
- ✅ Font Awesome icons display
- ✅ Socket.IO connects successfully
- ✅ Chart.js renders charts
- ✅ All dashboard functionality works

## 🆘 Emergency CSP Disable

If CSP completely blocks access, temporarily disable it:

1. **Edit security middleware in container**
   ```bash
   docker-compose exec discord-bot sh
   # Inside container:
   sed -i 's/contentSecurityPolicy: {/contentSecurityPolicy: false, \/\/ {/' /app/web/middleware/security.js
   exit
   ```

2. **Restart container**
   ```bash
   docker-compose restart
   ```

3. **Re-enable CSP later** by rebuilding with proper configuration.

---

**The CSP fix is ready - just rebuild your Docker container to activate it!** 🚀