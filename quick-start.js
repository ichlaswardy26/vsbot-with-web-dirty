#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Villain Seraphyx Manager Bot - Quick Setup');
console.log('='.repeat(50));

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function quickSetup() {
  try {
    console.log('\n📝 Mari setup bot Anda dengan informasi dasar...\n');

    // Bot credentials
    const token = await question('🤖 Discord Bot Token: ');
    const clientId = await question('🆔 Client ID (Application ID): ');
    const guildId = await question('🏠 Guild ID (Server ID): ');
    
    // Database
    const mongoUri = await question('🗄️  MongoDB Connection String: ');
    
    // Owner
    const ownerId = await question('👑 Your User ID (Owner): ');
    
    // Optional channels
    console.log('\n📢 Channel Setup (optional - tekan Enter untuk skip):');
    const welcomeChannel = await question('🎉 Welcome Channel ID: ');
    const ticketLogChannel = await question('🎫 Ticket Log Channel ID: ');
    const staffRole = await question('👮 Staff Role ID: ');

    // Create .env content
    const envContent = `# ==================== BOT CREDENTIALS ====================
TOKEN=${token}
CLIENT_ID=${clientId}
GUILD_ID=${guildId}

# ==================== MONGODB ====================
MONGO_URI=${mongoUri}

# ==================== OWNER & ADMIN ====================
OWNER_IDS=${ownerId}

# ==================== CHANNELS ====================
${welcomeChannel ? `WELCOME_CHANNEL_ID=${welcomeChannel}` : '# WELCOME_CHANNEL_ID='}
${ticketLogChannel ? `TICKET_LOG_CHANNEL_ID=${ticketLogChannel}` : '# TICKET_LOG_CHANNEL_ID='}

# ==================== ROLES ====================
${staffRole ? `STAFF_ROLE_ID=${staffRole}` : '# STAFF_ROLE_ID='}

# ==================== FEATURES SETTINGS ====================
XP_COOLDOWN=60000
XP_MIN=15
XP_MAX=25
VOICE_XP_PER_MINUTE=10
DAILY_REWARD=100
COLLECT_COOLDOWN=3600000

# ==================== EMBED COLORS ====================
COLOR_PRIMARY=#5865F2
COLOR_SUCCESS=#57F287
COLOR_ERROR=#ED4245
COLOR_WARNING=#FEE75C
COLOR_INFO=#5865F2

# ==================== OPTIONAL ====================
NODE_ENV=production
LOG_LEVEL=INFO
`;

    // Write .env file
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ File .env berhasil dibuat!');
    console.log('\n🔧 Setup selanjutnya:');
    console.log('1. npm start - untuk test bot');
    console.log('2. Edit .env untuk konfigurasi lanjutan');
    console.log('3. Baca SETUP_GUIDE.md untuk panduan lengkap');
    
    const startNow = await question('\n🚀 Mau start bot sekarang? (y/n): ');
    
    if (startNow.toLowerCase() === 'y' || startNow.toLowerCase() === 'yes') {
      console.log('\n🔄 Starting bot...\n');
      rl.close();
      
      // Start the bot
      require('./index.js');
    } else {
      console.log('\n👋 Setup selesai! Jalankan "npm start" untuk memulai bot.');
      rl.close();
    }
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    rl.close();
  }
}

quickSetup();