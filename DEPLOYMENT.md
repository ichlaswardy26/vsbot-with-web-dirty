# Deployment Guide

Quick guide for deploying Anna Manager Bot to various platforms.

## 🚀 General Deployment Steps

1. **Prepare Environment**
   ```bash
   npm install --production
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in all required values

3. **Test Locally**
   ```bash
   npm start
   ```

4. **Deploy to your platform**

---

## 🖥️ VPS Deployment (Recommended)

### Using PM2 (Process Manager)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the bot:
   ```bash
   pm2 start index.js --name anna-bot
   ```

3. Setup auto-restart on reboot:
   ```bash
   pm2 startup
   pm2 save
   ```

4. Useful PM2 commands:
   ```bash
   pm2 status          # Check status
   pm2 logs anna-bot   # View logs
   pm2 restart anna-bot # Restart bot
   pm2 stop anna-bot   # Stop bot
   ```

---

## ☁️ Heroku Deployment

1. Install Heroku CLI and login:
   ```bash
   heroku login
   ```

2. Create new Heroku app:
   ```bash
   heroku create your-app-name
   ```

3. Set environment variables:
   ```bash
   heroku config:set TOKEN=your_token
   heroku config:set MONGO_URI=your_mongo_uri
   heroku config:set CLIENT_ID=your_client_id
   ```

4. Deploy:
   ```bash
   git push heroku main
   ```

5. Scale worker:
   ```bash
   heroku ps:scale worker=1
   ```

**Note**: Procfile is already included in the project.

---

## 🚂 Railway Deployment

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables in Railway dashboard:
   - `TOKEN`
   - `MONGO_URI`
   - `CLIENT_ID`
   - `GUILD_ID` (optional)
5. Railway will auto-deploy

---

## 🔄 Replit Deployment

1. Import repository to Replit
2. Add secrets in Secrets tab (lock icon):
   - `TOKEN`
   - `MONGO_URI`
   - `CLIENT_ID`
3. Click "Run" button
4. Use UptimeRobot to keep bot alive (optional)

---

## 🐳 Docker Deployment

1. Create `Dockerfile`:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --production
   COPY . .
   CMD ["node", "index.js"]
   ```

2. Create `.dockerignore`:
   ```
   node_modules
   .env
   .git
   *.md
   ```

3. Build and run:
   ```bash
   docker build -t anna-bot .
   docker run -d --env-file .env anna-bot
   ```

---

## 📊 MongoDB Setup

### MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Whitelist IP (0.0.0.0/0 for all IPs)
5. Get connection string
6. Replace `<password>` and `<dbname>` in connection string

### Local MongoDB

```bash
# Install MongoDB
# Ubuntu/Debian
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb

# Connection string
MONGO_URI=mongodb://localhost:27017/anna-bot
```

---

## 🔐 Security Checklist

- [ ] Never commit `.env` file
- [ ] Use strong MongoDB password
- [ ] Whitelist specific IPs if possible
- [ ] Keep dependencies updated
- [ ] Use environment variables for all secrets
- [ ] Enable 2FA on hosting platform
- [ ] Regular backups of database

---

## 🔍 Monitoring

### Logs
```bash
# PM2
pm2 logs anna-bot

# Heroku
heroku logs --tail

# Docker
docker logs container_id
```

### Health Check
- Monitor bot status in Discord
- Check database connection
- Monitor memory usage
- Track error rates

---

## 🆘 Troubleshooting

### Bot not starting
- Check environment variables
- Verify MongoDB connection
- Check Node.js version (v16.9.0+)
- Review error logs

### Commands not working
- Verify bot permissions
- Check slash command registration
- Ensure bot is in guild
- Review command handler logs

### Database errors
- Check MongoDB connection string
- Verify database user permissions
- Check network connectivity
- Review schema definitions

---

## 📈 Performance Tips

- Use PM2 cluster mode for multiple cores
- Enable MongoDB indexes (already configured)
- Monitor memory usage
- Use CDN for static assets
- Implement rate limiting
- Regular database cleanup

---

## 🔄 Updates

To update deployed bot:

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Restart bot
pm2 restart anna-bot
# or
heroku restart
```

---

## 📞 Support

For deployment issues:
1. Check logs first
2. Review this guide
3. Check Discord.js documentation
4. Open GitHub issue

---

Happy deploying! 🎉
