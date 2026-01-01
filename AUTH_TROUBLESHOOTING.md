# 🔧 Discord Authentication Loop - Troubleshooting Guide

## 🚨 Problem: Authentication Loop

Users get stuck in an endless loop when trying to access the dashboard:
1. Visit `/dashboard` → Redirects to Discord OAuth
2. Complete Discord OAuth → Redirects back to `/dashboard`
3. **Loop**: Dashboard redirects to Discord OAuth again

## 🔍 Root Causes

### 1. **Cookie/Session Issues** (Most Common)
- **Secure cookies over HTTP**: Cookies marked `secure: true` won't work over HTTP
- **SameSite restrictions**: Strict SameSite policies block OAuth cookies
- **Domain mismatches**: Cookies set for wrong domain
- **Session store problems**: MongoDB session store connection issues

### 2. **OAuth Configuration Mismatches**
- **Callback URL mismatch**: Discord app callback ≠ actual callback URL
- **Missing client secret**: Invalid or missing `DISCORD_CLIENT_SECRET`
- **Scope issues**: Missing required scopes (`identify`, `guilds`)

### 3. **Middleware Conflicts**
- **Security middleware blocking**: CSRF or security middleware interfering
- **Session middleware order**: Passport initialized before session middleware
- **CORS issues**: Cross-origin restrictions blocking OAuth flow

## ✅ **Quick Fixes Applied**

### 1. **Fixed Session Configuration**
```javascript
// Before (Problematic)
cookie: {
  secure: true,        // Blocks HTTP connections
  sameSite: 'strict'   // Blocks OAuth redirects
}

// After (Fixed)
cookie: {
  secure: isSecure && !isIpBasedDeployment,  // Smart secure detection
  sameSite: isIpBasedDeployment ? 'none' : 'lax',  // OAuth-compatible
  domain: undefined    // No domain restriction for IP deployments
}
```

### 2. **Enhanced Authentication Logging**
- Added detailed logging to track OAuth flow
- Debug endpoint at `/auth/debug` for troubleshooting
- Session save confirmation before redirects

### 3. **Environment Configuration Fixes**
- Auto-generate secure session secrets
- Fix callback URL for IP-based deployments
- Set proper allowed origins

## 🔧 **How to Apply the Fix**

### **Option 1: Run the Fix Script (Recommended)**
```bash
# Make executable and run
chmod +x fix-auth-loop.sh
./fix-auth-loop.sh
```

### **Option 2: Manual Steps**

#### Step 1: Fix Environment Variables
```bash
# Add to .env file
SESSION_SECRET=your_generated_secret_here
DISCORD_CALLBACK_URL=https://43.129.55.161/auth/discord/callback
ALLOWED_ORIGINS=http://43.129.55.161,https://43.129.55.161
ENABLE_AUTH_DEBUG=true
```

#### Step 2: Restart Container
```bash
docker-compose -f docker-compose.ip.yml restart discord-bot
```

#### Step 3: Update Discord App Settings
1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to OAuth2 → General
4. Set Redirect URI: `https://43.129.55.161/auth/discord/callback`
5. Ensure scopes: `identify`, `guilds`

## 🧪 **Testing the Fix**

### 1. **Test Authentication Flow**
```bash
# Test OAuth initiation
curl -k -I https://43.129.55.161/auth/discord

# Should return 302 redirect to discord.com
```

### 2. **Check Debug Information**
```bash
# Get authentication debug info
curl -k https://43.129.55.161/auth/debug

# Should show session and config details
```

### 3. **Manual Browser Test**
1. Open: `https://43.129.55.161/dashboard`
2. Should redirect to Discord OAuth
3. Complete Discord authentication
4. Should return to dashboard (NOT loop back to OAuth)

## 🔍 **Diagnostic Commands**

### Check Container Logs
```bash
# Monitor authentication logs
docker-compose -f docker-compose.ip.yml logs -f discord-bot | grep -i auth

# Check for session errors
docker logs villain-seraphyx-bot | grep -i "session\|passport\|oauth"
```

### Test Endpoints
```bash
# Test health
curl -k https://43.129.55.161/health

# Test auth debug
curl -k https://43.129.55.161/auth/debug

# Test OAuth initiation
curl -k -I https://43.129.55.161/auth/discord
```

### Check Environment
```bash
# Verify environment variables
docker exec villain-seraphyx-bot env | grep -E "(DISCORD|SESSION|CALLBACK)"
```

## 🚨 **Common Issues and Solutions**

### Issue: "Session not found" or "User not authenticated"
**Cause**: Session store connection problems or cookie issues
**Solution**:
```bash
# Check MongoDB connection
docker exec villain-seraphyx-bot node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB OK'))
  .catch(err => console.error('MongoDB Error:', err));
"

# Restart with fresh session store
docker-compose -f docker-compose.ip.yml restart discord-bot
```

### Issue: "Invalid client" or OAuth errors
**Cause**: Discord application configuration mismatch
**Solution**:
1. Verify Discord app Client ID matches `CLIENT_ID` in .env
2. Verify Discord app Client Secret matches `DISCORD_CLIENT_SECRET` in .env
3. Verify Redirect URI in Discord app matches `DISCORD_CALLBACK_URL` in .env

### Issue: Cookies not being set
**Cause**: Secure cookie over HTTP or SameSite restrictions
**Solution**: The fix script addresses this by:
- Disabling secure cookies for IP-based deployments
- Setting SameSite to 'none' for IP-based deployments
- Removing domain restrictions

### Issue: CORS errors in browser console
**Cause**: Cross-origin restrictions
**Solution**: Ensure `ALLOWED_ORIGINS` includes your server IP:
```bash
ALLOWED_ORIGINS=http://43.129.55.161,https://43.129.55.161
```

## 📋 **Discord Application Checklist**

Ensure your Discord application at https://discord.com/developers/applications has:

### OAuth2 Settings
- ✅ **Client ID**: Matches your `CLIENT_ID` environment variable
- ✅ **Client Secret**: Matches your `DISCORD_CLIENT_SECRET` environment variable
- ✅ **Redirect URI**: `https://43.129.55.161/auth/discord/callback`
- ✅ **Scopes**: `identify`, `guilds`

### Bot Settings
- ✅ **Bot Token**: Matches your `TOKEN` environment variable
- ✅ **Bot Permissions**: Administrator or required permissions
- ✅ **Bot Added to Server**: Bot is in your Discord server

## 🎯 **Success Indicators**

Authentication is working correctly when:

### ✅ **OAuth Flow Works**
1. Visit `/dashboard` → Redirects to Discord
2. Complete Discord auth → Returns to dashboard
3. Dashboard loads without redirecting back to Discord

### ✅ **Debug Endpoint Shows**
```json
{
  "success": true,
  "debug": {
    "isAuthenticated": true,
    "user": { "id": "...", "username": "..." },
    "session": { "cookie": {...} }
  }
}
```

### ✅ **Logs Show Success**
```
[Auth] OAuth callback successful for user: YourUsername
[Auth] Session saved, redirecting to dashboard
[Auth] User YourUsername is authenticated
```

## 🔄 **If Issues Persist**

### 1. **Complete Reset**
```bash
# Stop containers
docker-compose -f docker-compose.ip.yml down

# Clear sessions
docker exec villain-seraphyx-bot node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(() => {
  return mongoose.connection.db.collection('sessions').deleteMany({});
}).then(() => console.log('Sessions cleared'));
"

# Restart
docker-compose -f docker-compose.ip.yml up -d
```

### 2. **Enable Detailed Logging**
```bash
# Add to .env
DEBUG=passport*,express-session
LOG_LEVEL=DEBUG

# Restart container
docker-compose -f docker-compose.ip.yml restart discord-bot
```

### 3. **Test with Different Browser**
- Try incognito/private mode
- Clear cookies and cache
- Test with different browser

## 📞 **Support Information**

If authentication still loops after applying fixes:

1. **Run diagnostics**: `./fix-auth-loop.sh`
2. **Check debug endpoint**: `curl -k https://43.129.55.161/auth/debug`
3. **Verify Discord app settings** match environment variables exactly
4. **Check container logs** for specific error messages
5. **Test with fresh browser session** (incognito mode)

The fix addresses the most common causes of authentication loops and should resolve the issue for IP-based deployments with self-signed certificates.