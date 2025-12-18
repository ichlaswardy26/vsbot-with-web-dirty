global.afkUsers = global.afkUsers || new Map();

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'afk',
  description: 'Atur status AFK',
  category: 'utility',
  args: false,
  usage: '[alasan]',
  async exec(client, message, args) {
    const userId = message.author.id;
    const username = message.author.username;
    const member = message.member;

    // Check if user is already AFK
    if (global.afkUsers.has(userId)) {
      const currentAfk = global.afkUsers.get(userId);
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Kamu Sudah AFK")
        .setDescription(`Kamu sudah dalam status AFK sejak <t:${Math.floor(currentAfk.timestamp / 1000)}:R>`)
        .setColor(config.colors?.warning || "#FEE75C")
        .addFields(
          { name: "📝 Alasan", value: currentAfk.reason, inline: false }
        )
        .setFooter({ text: "Kirim pesan apapun untuk membatalkan AFK" })
        .setTimestamp();
      
      return message.reply({ embeds: [embed] });
    }

    const reason = args.join(' ') || 'Tidak ada alasan';
    let originalNickname = member.nickname;
    const afkStartTime = Date.now();

    // Try to change nickname
    let nicknameChanged = false;
    try {
      if (member.manageable) {
        const currentName = originalNickname || username;
        const newNickname = `[AFK] ${currentName}`.substring(0, 32);
        
        if (!currentName.startsWith('[AFK]')) {
          await member.setNickname(newNickname);
          nicknameChanged = true;
        }
      } else {
        originalNickname = null;
      }
    } catch (error) {
      console.error('Failed to change nickname:', error);
      originalNickname = null;
    }

    // Save AFK status
    global.afkUsers.set(userId, {
      reason: reason,
      timestamp: afkStartTime,
      originalNickname: originalNickname
    });

    const embed = new EmbedBuilder()
      .setTitle("💤 Status AFK Diaktifkan")
      .setDescription(`${message.author} sekarang sedang AFK`)
      .setColor(config.colors?.primary || "#5865F2")
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "📝 Alasan", value: reason, inline: false },
        { name: "⏰ Waktu", value: `<t:${Math.floor(afkStartTime / 1000)}:F>`, inline: true },
        { name: "🏷️ Nickname", value: nicknameChanged ? '✅ Diubah ke [AFK]' : '❌ Tidak dapat diubah', inline: true }
      )
      .setFooter({ text: "Kirim pesan apapun untuk membatalkan AFK" })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
