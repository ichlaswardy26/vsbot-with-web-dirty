#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Villain Seraphyx Manager Bot - Quick Setup');
console.log('='.repeat(50));

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function validateDiscordId(id, fieldName) {
  if (!id) return { valid: false, message: `${fieldName} wajib diisi!` };
  if (!/^\d{17,20}$/.test(id)) {
    return { valid: false, message: `${fieldName} harus berupa angka 17-20 digit` };
  }
  return { valid: true };
}

function validateToken(token) {
  if (!token) return { valid: false, message: 'Token wajib diisi!' };
  // Discord token format: base64.base64.base64
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, message: 'Format token tidak valid (harus ada 3 bagian dipisah titik)' };
  }
  return { valid: true };
}

function validateMongoUri(uri) {
  if (!uri) return { valid: false, message: 'MongoDB URI wajib diisi!' };
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    return { valid: false, message: 'MongoDB URI harus dimulai dengan mongodb:// atau mongodb+srv://' };
  }
  return { valid: true };
}

async function askWithValidation(prompt, validator, fieldName) {
  while (true) {
    const answer = (await question(prompt)).trim();
    const result = validator(answer, fieldName);
    if (result.valid) {
      return answer;
    }
    console.log(`❌ ${result.message}\n`);
  }
}

async function askOptional(prompt) {
  const answer = (await question(prompt)).trim();
  if (!answer) return null;
  
  // Validate if it looks like a Discord ID
  if (!/^\d{17,20}$/.test(answer)) {
    console.log('⚠️  Format ID tidak valid, dilewati...\n');
    return null;
  }
  return answer;
}


async function quickSetup() {
  try {
    console.log('\n📝 Mari setup bot Anda dengan informasi dasar...\n');
    console.log('💡 Tip: Field dengan tanda (*) wajib diisi\n');

    // Bot credentials (required)
    const token = await askWithValidation(
      '🤖 Discord Bot Token (*): ',
      validateToken,
      'Token'
    );
    
    const clientId = await askWithValidation(
      '🆔 Client ID / Application ID (*): ',
      validateDiscordId,
      'Client ID'
    );
    
    const guildId = await askWithValidation(
      '🏠 Guild ID / Server ID (*): ',
      validateDiscordId,
      'Guild ID'
    );
    
    // Database (required)
    const mongoUri = await askWithValidation(
      '🗄️  MongoDB Connection String (*): ',
      validateMongoUri,
      'MongoDB URI'
    );
    
    // Owner (required)
    const ownerId = await askWithValidation(
      '👑 Your User ID / Owner ID (*): ',
      validateDiscordId,
      'Owner ID'
    );
    
    // Optional channels
    console.log('\n📢 Channel & Role Setup (opsional - tekan Enter untuk skip):');
    const welcomeChannel = await askOptional('🎉 Welcome Channel ID: ');
    const ticketLogChannel = await askOptional('🎫 Ticket Log Channel ID: ');
    const staffRole = await askOptional('👮 Staff Role ID: ');

    // Web Dashboard setup
    console.log('\n🌐 Web Dashboard Setup (opsional - tekan Enter untuk skip):');
    console.log('💡 Dapatkan Client Secret dari Discord Developer Portal > OAuth2\n');
    const clientSecret = (await question('🔐 Discord Client Secret: ')).trim() || null;
    const callbackUrl = (await question('🔗 Callback URL (default: http://localhost:3001/auth/discord/callback): ')).trim() || 'http://localhost:3001/auth/discord/callback';
    const webPort = (await question('🌍 Web Port (default: 3001): ')).trim() || '3001';
    const allowedOrigins = (await question('🔒 Allowed Origins (default: http://localhost:3001): ')).trim() || `http://localhost:${webPort}`;

    // Webhook setup
    console.log('\n🔔 Webhook Setup (opsional - tekan Enter untuk skip):');
    const webhookPort = (await question('📡 Webhook Port (default: 3000): ')).trim() || '3000';
    const webhookToken = (await question('🎫 Tako Webhook Token: ')).trim() || null;

    // API Keys
    console.log('\n🔑 API Keys (opsional - tekan Enter untuk skip):');
    const removeBgApiKey = (await question('🖼️  Remove.bg API Key: ')).trim() || null;

    // Generate random session secret
    const sessionSecret = require('crypto').randomBytes(32).toString('hex');

    // Create .env content
    const envContent = `# ==================== CORE CREDENTIALS (REQUIRED) ====================
TOKEN=${token}
CLIENT_ID=${clientId}
GUILD_ID=${guildId}
MONGO_URI=${mongoUri}

# ==================== OWNER & ADMIN (REQUIRED) ====================
OWNER_IDS=${ownerId}

# ==================== CHANNELS ====================
${welcomeChannel ? `WELCOME_CHANNEL_ID=${welcomeChannel}` : '# WELCOME_CHANNEL_ID='}
${ticketLogChannel ? `TICKET_LOG_CHANNEL_ID=${ticketLogChannel}` : '# TICKET_LOG_CHANNEL_ID='}

# ==================== ROLES ====================
${staffRole ? `STAFF_ROLE_ID=${staffRole}` : '# STAFF_ROLE_ID='}

# ==================== WEB DASHBOARD ====================
SESSION_SECRET=${sessionSecret}
WEB_PORT=${webPort}
ALLOWED_ORIGINS=${allowedOrigins}
${clientSecret ? `DISCORD_CLIENT_SECRET=${clientSecret}` : '# DISCORD_CLIENT_SECRET=your_discord_client_secret_here'}
DISCORD_CALLBACK_URL=${callbackUrl}

# ==================== WEBHOOK SERVER ====================
WEBHOOK_PORT=${webhookPort}
${webhookToken ? `WEBHOOK_TOKEN=${webhookToken}` : '# WEBHOOK_TOKEN=your_tako_webhook_token_here'}

# ==================== API KEYS (OPTIONAL) ====================
${removeBgApiKey ? `REMOVE_BG_API_KEY=${removeBgApiKey}` : '# REMOVE_BG_API_KEY='}

# ==================== ENVIRONMENT ====================
NODE_ENV=production
LOG_LEVEL=INFO
MAX_LOG_FILES=5
MAX_LOG_SIZE=10485760
`;

    // Check if .env already exists
    if (fs.existsSync('.env')) {
      const overwrite = await question('\n⚠️  File .env sudah ada. Overwrite? (y/n): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('❌ Setup dibatalkan. File .env tidak diubah.');
        rl.close();
        return;
      }
    }

    // Write .env file
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ File .env berhasil dibuat!');
    console.log('\n🔧 Langkah selanjutnya:');
    console.log('   1. npm start - untuk menjalankan bot');
    console.log('   2. Edit .env untuk konfigurasi lanjutan');
    console.log('   3. Baca SETUP_GUIDE.md untuk panduan lengkap');
    
    const startNow = await question('\n🚀 Mau start bot sekarang? (y/n): ');
    
    if (startNow.toLowerCase() === 'y' || startNow.toLowerCase() === 'yes') {
      console.log('\n🔄 Starting bot...\n');
      rl.close();
      
      try {
        require('./index.js');
      } catch (err) {
        console.error('❌ Gagal menjalankan bot:', err.message);
        console.log('💡 Coba jalankan manual dengan: npm start');
        process.exit(1);
      }
    } else {
      console.log('\n👋 Setup selesai! Jalankan "npm start" untuk memulai bot.');
      rl.close();
    }
    
  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    rl.close();
    process.exit(1);
  }
}

quickSetup();
