const Responder = require('../../schemas/autoresponder');
const handleWordChainMessage = require('../../handlers/wordChainMessageHandler');
const { getXpRequirement, getMessageXp } = require("../../util/levelUtils");
const { getLevelUpReward, addSouls, formatNumber } = require("../../util/economyUtils.js");
const { updateLevelRole } = require("../../util/roleUtils");
const { updateLeaderboardXP } = require("../../util/leaderboardUtils");
const { giveXp } = require("../../util/applyXpWithBoost");
const { safeReply, safeSend } = require("../../util/messageUtils");
const Activity = require("../../schemas/Activity");
const config = require("../../config.js");

// Cooldown per user for XP
const messageUsers = new Map();

// ID channel log for level ups - now using config

module.exports = {
  name: "messageCreate",
  async exec(client, message) {
    if (!message.guild) return;
    
    // Skip bot messages
    if (message.author.bot) return;

    // Handle word chain game messages first
    const wasWordChainMessage = await handleWordChainMessage(client, message);
    if (wasWordChainMessage) return; // Stop processing if it was a word chain answer

    const userId = message.author.id;
    const username = message.author.username;
    const member = message.member;

    // --- Bagian 1: Cek apakah pengirim pesan sedang AFK dan cabut statusnya ---
    if (global.afkUsers && global.afkUsers.has(userId)) {
        const afkInfo = global.afkUsers.get(userId);
        const timeAfk = Date.now() - afkInfo.timestamp;
        
        // Format waktu AFK
        const seconds = Math.floor(timeAfk / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        let timeString = '';
        if (days > 0) timeString += `${days} hari `;
        if (hours % 24 > 0) timeString += `${hours % 24} jam `;
        if (minutes % 60 > 0) timeString += `${minutes % 60} menit `;
        if (seconds % 60 > 0) timeString += `${seconds % 60} detik`;
        if (timeString === '') timeString = 'baru saja';

        // Hapus status AFK
        global.afkUsers.delete(userId);

        // Kembalikan nickname asli
        let nicknameRestored = false;
        if (member && member.manageable) {
            try {
                // Jika originalNickname null, berarti user tidak punya nickname sebelumnya
                await member.setNickname(afkInfo.originalNickname);
                nicknameRestored = true;
            } catch (error) {
                console.error('Gagal mengembalikan nickname:', error);
            }
        }

        // Kirim pesan welcome back
        const welcomeMessage = `✅ Selamat datang kembali, ${username}! Status AFK Anda telah dicabut. Waktu AFK: ${timeString.trim()}`;
        message.channel.send(welcomeMessage).catch(console.error);

        // Jangan return, biarkan pesan diproses normal (command, XP, dll)
    }

    // --- Bagian 2: Cek apakah pesan me-mention user yang sedang AFK ---
    if (global.afkUsers && message.mentions.users.size > 0) {
        const { EmbedBuilder } = require('discord.js');
        
        message.mentions.users.forEach(mentionedUser => {
            if (global.afkUsers.has(mentionedUser.id)) {
                const afkInfo = global.afkUsers.get(mentionedUser.id);
                const timeAfk = Date.now() - afkInfo.timestamp;

                // Format waktu AFK
                const seconds = Math.floor(timeAfk / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                let timeString = '';
                if (days > 0) timeString += `${days} hari `;
                if (hours % 24 > 0) timeString += `${hours % 24} jam `;
                if (minutes % 60 > 0) timeString += `${minutes % 60} menit `;
                if (seconds % 60 > 0) timeString += `${seconds % 60} detik`;
                if (timeString === '') timeString = 'baru saja';

                // Kirim embed informasi AFK
                const embed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('💤 User Sedang AFK')
                    .setDescription(`${mentionedUser} sedang tidak aktif`)
                    .addFields(
                        { name: '📝 Alasan', value: afkInfo.reason, inline: false },
                        { name: '⏰ Sejak', value: `<t:${Math.floor(afkInfo.timestamp / 1000)}:R>`, inline: true },
                        { name: '⌛ Durasi', value: timeString.trim(), inline: true }
                    )
                    .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'Mereka akan kembali segera' })
                    .setTimestamp();

                message.channel.send({ embeds: [embed] }).catch(console.error);
            }
        });
    }

    // Process commands
    const isCommand = await processCommands(client, message);
    
    // If it was a command, don't give XP
    if (isCommand) return;

    // ========================================
    // XP & LEVELING SYSTEM
    // ========================================
    await trackMessageActivity(message);
    await handleMessageXP(client, message);
  }
};

// Track character activity
async function trackMessageActivity(message) {
  if (!message.guild || message.author.bot) return;
  const charCount = message.content.trim().length;
  if (charCount === 0) return;

  try {
    await Activity.findOneAndUpdate(
      { guildId: message.guild.id, userId: message.author.id },
      {
        $inc: { characters: charCount },
        $set: { lastMessageAt: new Date() },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("Activity tracking error:", err);
  }
}

// Handle XP and leveling
async function handleMessageXP(client, message) {
  const userId = message.author.id;
  const guildId = message.guild.id;
  const userKey = `${userId}-${guildId}`;
  const now = new Date();

  try {
    const lastMessageTime = messageUsers.get(userKey);
    if (!lastMessageTime || (now - lastMessageTime) >= 60000) {
      const earnedXp = getMessageXp(message.content);

      // Get XP result with old level before level up
      const result = await giveXp(client, userId, guildId, earnedXp);
      messageUsers.set(userKey, now);

      // If no level up, stop here
      if (!result.levelUp) return;

      // If level up, continue processing
      const logChannel = config.channels.voiceLog ? client.channels.cache.get(config.channels.voiceLog) : null;
      if (!logChannel?.isTextBased()) return;

      const soulsEarned = getLevelUpReward(result.newLevel);
      await addSouls(userId, guildId, soulsEarned);

      // Update role
      const member = message.member;
      await updateLevelRole(member, result.newLevel);

      // Update leaderboard XP
      await updateLeaderboardXP(userId, guildId, message.author.username, result.xpAdded);

      // Tier milestone system
      function getTierName(level) {
        if (level >= 50) return "Seraphix Ω";
        if (level >= 40) return "Seraphim";
        if (level >= 30) return "Eldritch";
        if (level >= 20) return "Sovereign";
        if (level >= 11) return "Soulborne";
        return null;
      }

      const milestoneLevels = [11, 20, 30, 40, 50];
      const tierName = getTierName(result.newLevel);

      // Send notification only on level up
      const levelUpLines = [
        `${config.emojis.levelup} **|** ${message.author} naik ke level **${result.newLevel}**! \`[${Math.floor(result.totalXp)}/${getXpRequirement(result.newLevel)}]\``,
        `${config.emojis.souls} **|** Mendapatkan ${formatNumber(soulsEarned)} souls!`,
        `${config.emojis.blank} **|** Terus aktif dan dapatkan reward menarik lainnya!`
      ];

      if (milestoneLevels.includes(result.newLevel) && tierName) {
        levelUpLines.push(`${config.emojis.tier} **|** Kamu telah mencapai tier **${tierName}**!`);
      }

      await logChannel.send(levelUpLines.join("\n")).catch(console.error);
    }
  } catch (err) {
    console.error("Error in XP system:", err);
  }
}

// Helper function to process commands
// Returns true if a command was executed, false otherwise
async function processCommands(client, message) {
  const prefix = client.config.prefix.toLowerCase();
  const mentionRegex = new RegExp(`^<@!?${client.user.id}>`);
  const isMentionCommand = message.content.match(mentionRegex);
  const startsWithPrefix = message.content.toLowerCase().startsWith(prefix);

  if (isMentionCommand) {
    const args = message.content.replace(mentionRegex, '').trim().split(/ +/g);
    const commandName = args.shift()?.toLowerCase();

    if (commandName) {
      const command = client.commands.get(commandName) || 
                      client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

      if (command) {
        try {
          await command.exec(client, message, args);
          return true; // Command executed
        } catch (error) {
          console.error(error);
          await safeSend(message.channel, 'An error occurred while executing this command.');
          return true; // Still a command attempt
        }
      } else {
        await message.channel.send(`Command \`${commandName}\` tidak ditemukan.`);
        return true; // Command attempt
      }
    } else {
      const responseMessage = 'Tes tes masookk!!';
      await message.channel.send(responseMessage);
      return true; // Bot mention
    }
  }

  if (startsWithPrefix) {
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName) || 
                    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (command) {
      try {
        await command.exec(client, message, args);
        return true; // Command executed
      } catch (error) {
        console.error(error);
        await safeSend(message.channel, 'An error occurred while executing this command.');
        return true; // Still a command attempt
      }
    }
    return false; // Not a valid command, allow XP
  } else {
    try {
      const responders = await Responder.find();
      for (const responder of responders) {
        // Convert both the message content and the trigger to lowercase and trim extra spaces
        if (message.content.toLowerCase().trim() === responder.trigger.toLowerCase().trim()) {
          await message.channel.send(responder.response);
          return false; // Autoresponder triggered, but still give XP
        }
      }
    } catch (err) {
      console.error('Error fetching autoresponders:', err);
    }
  }

  return false; // Not a command, allow XP
}
