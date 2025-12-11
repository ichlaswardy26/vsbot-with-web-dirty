const { EmbedBuilder } = require("discord.js");
const { getOrCreateEconomy, formatNumber } = require("../../util/economyUtils");

// Role dan reward
const LEVEL_ROLES = {
  10: "1372855014607028304",
  20: "1372855062526951425",
  30: "1372855106931916831",
  40: "1372855135146872853",
  50: "1372855165174022205",
};

const ROLE_REWARDS = {
  10: 1000,
  20: 2000,
  30: 3000,
  40: 4000,
  50: 5000,
};

module.exports = {
  name: "collect",
  description: "Klaim souls berdasarkan role level yang kamu miliki",
  async exec(client, message) {
    try {
      const member = message.member;
      const guildId = message.guild.id;
      const userId = member.id;

      const economy = await getOrCreateEconomy(userId, guildId);

      const now = Date.now();
      const cooldown = 24 * 60 * 60 * 1000; // 24 jam
      const lastCollect = economy.lastCollect || 0;

      // Cooldown
      if (now - lastCollect < cooldown) {
        const remaining = cooldown - (now - lastCollect);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        const cooldownEmbed = new EmbedBuilder()
          .setColor("#ff4040")
          .setTitle("⏳ Sudah Mengklaim Hari Ini")
          .setDescription(
            `Kamu sudah klaim reward hari ini.\nCoba lagi dalam **${hours} jam ${minutes} menit**.`
          )
          .setFooter({ text: "Daily Collect Cooldown" });

        return message.reply({ embeds: [cooldownEmbed] });
      }

      // Cek role yang dimiliki
      const ownedRoles = [];
      let totalReward = 0;

      for (const [level, roleId] of Object.entries(LEVEL_ROLES)) {
        if (member.roles.cache.has(roleId)) {
          ownedRoles.push(level);
          totalReward += ROLE_REWARDS[level] || 0;
        }
      }

      if (ownedRoles.length === 0) {
        const noRoleEmbed = new EmbedBuilder()
          .setColor("#ffcc00")
          .setTitle("😢 Tidak Ada Role Reward")
          .setDescription("Kamu belum memiliki role level yang memberikan reward.")
          .setFooter({ text: "Collect System" });

        return message.reply({ embeds: [noRoleEmbed] });
      }

      // Tambahkan reward
      economy.cash += totalReward;
      economy.lastCollect = now;
      await economy.save();

      const roleList = ownedRoles
        .map(
          (lvl) => `<@&${LEVEL_ROLES[lvl]}> — **${formatNumber(ROLE_REWARDS[lvl])} souls**`
        )
        .join("\n");

      // Buat embed hasil collect
      const embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("💎 Reward Role Terkumpul!")
        .setDescription(
          `Kamu mendapatkan reward dari role berikut:\n\n${roleList}\n\n💰 **Total Diterima:** ${formatNumber(
            totalReward
          )} souls\n🪙 **Saldo Sekarang:** ${formatNumber(economy.cash)} souls`
        )
        .setThumbnail(
          message.author.displayAvatarURL({ dynamic: true, size: 1024 })
        )
        .setFooter({
          text: `Diklaim oleh ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in collect command:", error);
      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("⚠️ Terjadi Kesalahan")
        .setDescription("Terjadi kesalahan saat mengklaim reward role!")
        .setFooter({ text: "Collect Command Error" });
      message.reply({ embeds: [errorEmbed] });
    }
  },
};
