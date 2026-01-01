# Docker Troubleshooting Guide

## 🐳 Docker Container Startup Issues

This guide helps diagnose and resolve Docker container startup issues for the Villain Seraphyx Discord Bot.

## 🔍 Quick Diagnostics

### 1. Test Local Startup (Without Docker)

Before using Docker, test if the bot starts locally:

```bash
# Install dependencies
npm install

# Test startup configuration
npm run test:startup

# Start the bot locally
npm start
```

### 2. Check Environment Variables

Ensure your `.env` file contains all required variables:

```env
# Required Variables
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
MONGO_URI=your_mongodb_connection_string

# Optional but Recommended
GUILD_ID=your_main_guild_id
SESSION_SECRET=your_session_secret
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback

# Web Dashboard
WEB_PORT=3001
WEBHOOK_PORT=3000
WEBHOOK_TOKEN=your_webhook_token

# Database
NODE_ENV=production
```

### 3. Docker Build and Run Commands

#### Development Build
```bash
# Build the image
docker build -t villain-seraphyx-bot .

# Run with environment file
docker run -d \
  --name villain-seraphyx-bot \
  --env-file .env \
  -p 3000:3000 \
  -p 3001:3001 \
  villain-seraphyx-bot
```

#### Production with Docker Compose
```bash
# Using default compose file
docker-compose up -d

# Using production compose file
docker-compose -f docker-compose.prod.yml up -d
```

## 🚨 Common Issues and Solutions

### Issue 1: Container Exits Immediately

**Symptoms:**
- Container starts but exits within seconds
- No logs or minimal logs

**Diagnosis:**
```bash
# Check container logs
docker logs villain-seraphyx-bot

# Check container status
docker ps -a
```

**Solutions:**
1. **Missing Environment Variables:**
   ```bash
   # Verify .env file exists and has correct variables
   cat .env
   
   # Test locally first
   npm run test:startup
   ```

2. **Dependency Issues:**
   ```bash
   # Rebuild with no cache
   docker build --no-cache -t villain-seraphyx-bot .
   
   # Check if all dependencies are installed
   docker run -it villain-seraphyx-bot npm list
   ```

3. **MongoDB Connection Issues:**
   ```bash
   # Test MongoDB connection
   docker run -it --env-file .env villain-seraphyx-bot node -e "
   const mongoose = require('mongoose');
   mongoose.connect(process.env.MONGO_URI)
     .then(() => console.log('MongoDB OK'))
     .catch(err => console.error('MongoDB Error:', err.message));
   "
   ```

### Issue 2: Syntax Errors or Module Not Found

**Symptoms:**
- Error messages about missing modules
- Syntax errors in logs

**Solutions:**
1. **Check Node.js Version:**
   ```bash
   # Ensure using Node.js 20+
   docker run -it villain-seraphyx-bot node --version
   ```

2. **Verify File Structure:**
   ```bash
   # Check if all files are copied correctly
   docker run -it villain-seraphyx-bot ls -la
   docker run -it villain-seraphyx-bot ls -la web/
   docker run -it villain-seraphyx-bot ls -la util/
   ```

3. **Test Dependencies:**
   ```bash
   # Check if critical modules can be loaded
   docker run -it villain-seraphyx-bot node -e "
   try {
     require('discord.js');
     require('mongoose');
     require('express');
     console.log('Core modules OK');
   } catch(e) {
     console.error('Module error:', e.message);
   }
   "
   ```

### Issue 3: Health Check Failures

**Symptoms:**
- Container shows as unhealthy
- Health check timeouts

**Diagnosis:**
```bash
# Check health status
docker inspect villain-seraphyx-bot | grep -A 10 Health

# Run health check manually
docker exec villain-seraphyx-bot npm run docker:health
```

**Solutions:**
1. **Increase Health Check Timeout:**
   ```dockerfile
   HEALTHCHECK --interval=30s --timeout=30s --start-period=120s --retries=3 \
       CMD node docker-health-check.js
   ```

2. **Check Port Accessibility:**
   ```bash
   # Test if ports are accessible inside container
   docker exec villain-seraphyx-bot curl -f http://localhost:3000/health
   docker exec villain-seraphyx-bot curl -f http://localhost:3001/health
   ```

### Issue 4: Permission Denied Errors

**Symptoms:**
- Permission denied when accessing files
- Cannot write to log directory

**Solutions:**
1. **Fix File Permissions:**
   ```bash
   # Ensure proper ownership
   sudo chown -R 1001:1001 ./logs
   chmod 755 ./logs
   ```

2. **Update Dockerfile:**
   ```dockerfile
   # Create logs directory with proper permissions
   RUN mkdir -p /app/logs && chown -R botuser:nodejs /app/logs
   ```

### Issue 5: Memory or Resource Issues

**Symptoms:**
- Container killed by OOM killer
- Slow performance or timeouts

**Solutions:**
1. **Increase Memory Limits:**
   ```yaml
   # In docker-compose.yml
   services:
     discord-bot:
       deploy:
         resources:
           limits:
             memory: 2G
           reservations:
             memory: 512M
   ```

2. **Monitor Resource Usage:**
   ```bash
   # Check resource usage
   docker stats villain-seraphyx-bot
   
   # Check memory usage inside container
   docker exec villain-seraphyx-bot free -h
   ```

## 🔧 Advanced Debugging

### Interactive Container Debugging

```bash
# Start container in interactive mode
docker run -it --env-file .env villain-seraphyx-bot /bin/bash

# Or access running container
docker exec -it villain-seraphyx-bot /bin/bash

# Inside container, test components:
node test-startup.js
node -e "console.log('Node.js version:', process.version)"
npm list --depth=0
```

### Log Analysis

```bash
# Follow logs in real-time
docker logs -f villain-seraphyx-bot

# Get last 100 lines
docker logs --tail 100 villain-seraphyx-bot

# Check specific log files inside container
docker exec villain-seraphyx-bot ls -la logs/
docker exec villain-seraphyx-bot cat logs/app.log
```

### Network Debugging

```bash
# Check if container can reach external services
docker exec villain-seraphyx-bot ping discord.com
docker exec villain-seraphyx-bot nslookup discord.com

# Test MongoDB connection
docker exec villain-seraphyx-bot node -e "
const mongoose = require('mongoose');
console.log('Testing MongoDB connection...');
mongoose.connect(process.env.MONGO_URI, {serverSelectionTimeoutMS: 5000})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));
"
```

## 📋 Pre-Deployment Checklist

Before deploying with Docker, ensure:

- [ ] `.env` file exists with all required variables
- [ ] Local startup test passes (`npm run test:startup`)
- [ ] MongoDB is accessible from Docker network
- [ ] Discord bot token is valid and bot is added to server
- [ ] Required ports (3000, 3001) are available
- [ ] Sufficient system resources (1GB+ RAM recommended)
- [ ] Docker and Docker Compose are up to date

## 🆘 Getting Help

If issues persist:

1. **Collect Debug Information:**
   ```bash
   # System info
   docker version
   docker-compose version
   uname -a
   
   # Container info
   docker inspect villain-seraphyx-bot
   docker logs villain-seraphyx-bot > bot-logs.txt
   
   # Test results
   npm run test:startup > startup-test.txt 2>&1
   ```

2. **Check Common Solutions:**
   - Verify all environment variables are set correctly
   - Ensure MongoDB is accessible and credentials are correct
   - Check Discord bot permissions and token validity
   - Verify system has sufficient resources

3. **Create Minimal Reproduction:**
   - Test with a fresh clone of the repository
   - Use a clean Docker environment
   - Test with minimal configuration

## 🔄 Recovery Procedures

### Complete Reset

```bash
# Stop and remove containers
docker-compose down
docker rm -f villain-seraphyx-bot

# Remove images
docker rmi villain-seraphyx-bot

# Clean build cache
docker system prune -f

# Rebuild and restart
docker-compose up -d --build
```

### Backup and Restore

```bash
# Backup logs before reset
docker cp villain-seraphyx-bot:/app/logs ./logs-backup

# After restart, check if logs directory exists
docker exec villain-seraphyx-bot ls -la logs/
```

This troubleshooting guide should help resolve most Docker-related issues. The enhanced startup scripts and health checks provide better error reporting and recovery mechanisms.