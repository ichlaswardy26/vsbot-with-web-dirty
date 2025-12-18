require("dotenv").config();
const { Client, Collection, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");
const { readdirSync } = require("fs");
require("./errorHandlers");
const constants = require("./util/constants");
const config = require("./config.js");
const ConfessionState = require("./schemas/ConfessionState");
const express = require("express");
const crypto = require("crypto");

// Discord Client Setup
const client = new Client({
  intents: Object.values(constants.IntentsFlags).filter((v) => typeof v === "number"),
  allowedMentions: { parse: ["users", "roles"], repliedUser: false },
  ws: {
    properties: {
      browser: "Discord iOS"
    }
  }
});

// Initialize global variables
global.afkUsers = global.afkUsers || new Map();
global.activeVoiceUsers = global.activeVoiceUsers || new Map();
global.voiceXpInterval = null;
global.voiceDurationInterval = null;

// Initialize collections
client.commands = new Collection();
client.config = config;
client.lastConfessionMessage = new Map();
client.embedBuilders = new Map();
client.games = new Collection();
client.snipes = new Map();

// Web Server instance
let webServer = null;

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   🗄️  DATABASE CONNECTION SUCCESS     ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║  Status    : ✅ Connected              ║');
    console.log('║  Database  : MongoDB Atlas             ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ❌ DATABASE CONNECTION FAILED        ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.error("Error details:", error);
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('[MongoDB] Connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected. Attempting to reconnect...');
});

/**
 * Load confession states from database
 */
const loadConfessionStates = async () => {
  try {
    const states = await ConfessionState.find({});
    states.forEach((s) => {
      client.lastConfessionMessage.set(s.guildId, s.lastMessageId);
    });
    console.log(`[Confession] Loaded ${states.length} confession states`);
  } catch (error) {
    console.error('[Confession] Failed to load states:', error);
  }
};

/**
 * Start Tako Donation Webhook Server
 */
const startWebhookServer = () => {
  const webhookApp = express();
  webhookApp.use(express.json());

  const webhookPort = config.webhook?.port || 3000;
  const webhookToken = config.webhook?.token;

  if (!webhookToken) {
    console.warn('[Webhook] WEBHOOK_TOKEN not configured, Tako webhook disabled');
    return null;
  }

  webhookApp.post('/tako', async (req, res) => {
    const takoSignature = req.headers['x-tako-signature'];
    if (!takoSignature) {
      return res.status(400).send('Missing signature header');
    }

    const computedSignature = crypto
      .createHmac('sha256', webhookToken)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const isValidSignature = crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(takoSignature)
    );

    if (!isValidSignature) {
      return res.status(400).send('Invalid signature');
    }

    const data = req.body;
    console.log(`[Tako] Donation received from ${data.gifterName || 'Anonymous'} - Amount: ${data.amount || 'N/A'}`);

    try {
      // Get donation channel from dynamic config
      const fullConfig = await config.getConfig();
      const donationChannelId = fullConfig.channels?.donation;
      
      if (!donationChannelId) {
        console.warn('[Tako] Donation channel not configured');
        return res.status(200).send('OK');
      }

      const channel = await client.channels.fetch(donationChannelId);
      if (!channel?.isTextBased()) {
        console.warn('[Tako] Donation channel is not text-based');
        return res.status(200).send('OK');
      }

      const embed = new EmbedBuilder()
        .setColor(fullConfig.colors?.success || '#00FF00')
        .setTitle(`${fullConfig.emojis?.donation || '💰'} Terima Kasih atas Donasinya!`)
        .setDescription(`Terima kasih **${data.gifterName || 'Anonymous'}** atas donasi sebesar **${data.amount || 'N/A'}** dengan pesan:\n\`\`\`${data.message || 'Tidak ada pesan'}\`\`\``)
        .setTimestamp()
        .setFooter({ text: '© 2025 Villain Seraphyx.' });

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[Tako] Error sending donation message:', err.message);
    }

    return res.status(200).send('OK');
  });

  webhookApp.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'tako-webhook' });
  });

  const server = webhookApp.listen(webhookPort, () => {
    console.log(`[Webhook] Tako webhook server running on port ${webhookPort}`);
  });

  return server;
};

/**
 * Start Web Dashboard
 */
const startWebDashboard = async () => {
  try {
    const WebServer = require('./web/server');
    webServer = new WebServer(client);
    await webServer.start();
    console.log(`[Dashboard] Web dashboard running on port ${config.web?.port || 3001}`);
  } catch (error) {
    console.error('[Dashboard] Failed to start web dashboard:', error);
  }
};

/**
 * Initialize bot
 */
const initialize = async () => {
  // Connect to database first
  await connectDB();
  
  // Load handlers
  const handlerFiles = readdirSync("./handlers/").filter(file => file.endsWith('.js'));
  for (const file of handlerFiles) {
    const handler = require(`./handlers/${file}`);
    if (typeof handler === 'function') {
      handler(client);
    }
  }
  
  // Load confession states
  await loadConfessionStates();
  
  // Start webhook server
  const webhookServer = startWebhookServer();
  
  // Login to Discord
  await client.login(config.token);
  
  // Start web dashboard after bot is ready
  client.once('ready', async () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║        🤖 BOT IS NOW ONLINE! 🚀       ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Bot Tag   : ${client.user.tag.padEnd(23)}║`);
    console.log(`║  Bot ID    : ${client.user.id.padEnd(23)}║`);
    console.log(`║  Servers   : ${String(client.guilds.cache.size).padEnd(23)}║`);
    console.log(`║  Users     : ${String(client.users.cache.size).padEnd(23)}║`);
    console.log('╠════════════════════════════════════════╣');
    console.log('║  Status    : ✅ All Systems Ready      ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    // Start web dashboard
    await startWebDashboard();
  });
  
  // Store webhook server reference for cleanup
  client.webhookServer = webhookServer;
};

// Message delete handler for snipe command
client.on("messageDelete", (message) => {
  if (!message.guild || message.author?.bot) return;

  client.snipes.set(message.channel.id, {
    content: message.content,
    author: message.author,
    time: message.createdAt,
    image: message.attachments.first()?.proxyURL || null,
  });
});

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] Received ${signal}, shutting down gracefully...`);
  
  // Clear intervals
  if (global.voiceXpInterval) clearInterval(global.voiceXpInterval);
  if (global.voiceDurationInterval) clearInterval(global.voiceDurationInterval);
  
  // Stop web dashboard
  if (webServer) {
    await webServer.stop();
  }
  
  // Stop webhook server
  if (client.webhookServer) {
    client.webhookServer.close();
  }
  
  // Close MongoDB connection
  await mongoose.connection.close();
  
  // Destroy Discord client
  client.destroy();
  
  console.log('[Shutdown] Complete');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start the bot
initialize().catch(error => {
  console.error('[Fatal] Failed to initialize bot:', error);
  process.exit(1);
});
