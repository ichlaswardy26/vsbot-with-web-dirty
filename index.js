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

const app = express();
const mongoUri = config.mongoUri;
const webhookToken = process.env.WEBHOOK_TOKEN || "lo1j7xgrossc6io5q90dh9d3";

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


const connectDB = async () => {
    try {
        await mongoose.connect(mongoUri, {
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

// Handle MongoDB connection errors
mongoose.connection.on('error', err => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ⚠️  DATABASE CONNECTION ERROR       ║');
    console.log('╚════════════════════════════════════════╝');
    console.error(err);
});

mongoose.connection.on('disconnected', () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ⚠️  DATABASE DISCONNECTED           ║');
    console.log('║   Attempting to reconnect...           ║');
    console.log('╚════════════════════════════════════════╝\n');
});

client.commands = new Collection();
client.config = config;
client.lastConfessionMessage = new Map();
client.embedBuilders = new Map();
client.games = new Collection();

connectDB();

// Load command and event handlers
const handlerFiles = readdirSync("./handlers/").filter(file => file.endsWith('.js'));
for (const file of handlerFiles) {
    const handler = require(`./handlers/${file}`);
    if (typeof handler === 'function') {
        handler(client);
    }
}

const loadConfessionStates = async () => {
    const states = await ConfessionState.find({});
    states.forEach((s) => {
        client.lastConfessionMessage.set(s.guildId, s.lastMessageId);
    });
    console.log('╔════════════════════════════════════════╗');
    console.log('║   💬 CONFESSION STATES LOADED         ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Loaded States : ${String(states.length).padEnd(20)}║`);
    console.log('╚════════════════════════════════════════╝\n');
};

loadConfessionStates();

client.snipes = new Map();

client.on("messageDelete", (message) => {
    if (!message.guild || message.author?.bot) return;

    client.snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        time: message.createdAt,
        image: message.attachments.first()?.proxyURL || null,
    });
});

// Bot ready event
client.on('clientReady', () => {
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
});



// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      🛑 SHUTTING DOWN GRACEFULLY      ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║  Clearing intervals...                 ║');
    
    // Clear intervals
    if (global.voiceXpInterval) clearInterval(global.voiceXpInterval);
    if (global.voiceDurationInterval) clearInterval(global.voiceDurationInterval);
    
    console.log('║  Closing database connection...        ║');
    // Close MongoDB connection
    await mongoose.connection.close();
    
    console.log('║  Destroying Discord client...          ║');
    // Destroy Discord client
    client.destroy();
    
    console.log('╠════════════════════════════════════════╣');
    console.log('║  ✅ Shutdown Complete                  ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      🛑 SHUTTING DOWN GRACEFULLY      ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║  Clearing intervals...                 ║');
    
    // Clear intervals
    if (global.voiceXpInterval) clearInterval(global.voiceXpInterval);
    if (global.voiceDurationInterval) clearInterval(global.voiceDurationInterval);
    
    console.log('║  Closing database connection...        ║');
    // Close MongoDB connection
    await mongoose.connection.close();
    
    console.log('║  Destroying Discord client...          ║');
    // Destroy Discord client
    client.destroy();
    
    console.log('╠════════════════════════════════════════╣');
    console.log('║  ✅ Shutdown Complete                  ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    process.exit(0);
});

client.login(config.token);
// Tako Donation Webhook Server
app.use(express.json());

app.post('/tako', (req, res) => {
    const takoSignatureFromHeader = req.headers['x-tako-signature'];
    if (!takoSignatureFromHeader) {
        return res.status(400).send('Missing signature header');
    }

    const computedSignature = crypto
        .createHmac('sha256', webhookToken)
        .update(JSON.stringify(req.body))
        .digest('hex');

    const isValidSignature = crypto.timingSafeEqual(
        Buffer.from(computedSignature),
        Buffer.from(takoSignatureFromHeader)
    );

    if (isValidSignature) {
        const data = req.body;
        console.log(`\n💰 Donation received from ${data.gifterName || 'Anonymous'} - Amount: ${data.amount || 'N/A'}`);

        const donationChannelId = config.channels.donation;
        if (!donationChannelId) {
            console.error('Donation channel ID not configured in .env');
            return res.status(500).send('Donation channel not configured');
        }

        client.channels.fetch(donationChannelId)
            .then(channel => {
                if (!channel?.isTextBased()) return;
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('💰 Terima Kasih atas Donasinya!')
                    .setDescription(`Terima kasih **${data.gifterName || 'Anonymous'}** atas donasi sebesar **${data.amount || 'N/A'}** dengan pesan:\n\`\`\`${data.message || 'Tidak ada pesan'}\`\`\``)
                    .setTimestamp()
                    .setFooter({ text: '© 2025 Villain Seraphyx.' });

                channel.send({ embeds: [embed] });
            })
            .catch(err => {
                console.error('❌ Webhook error:', err.message);
            });

        return res.status(200).send('OK');
    } else {
        return res.status(400).send('Invalid signature');
    }
});

app.listen(3000, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     💰 TAKO WEBHOOK SERVER STARTED    ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║  Port      : 3000                      ║');
    console.log('║  Endpoint  : /tako                     ║');
    console.log('║  Status    : ✅ Listening              ║');
    console.log('╚════════════════════════════════════════╝\n');
});