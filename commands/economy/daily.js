const { EmbedBuilder } = require("discord.js");
const { getOrCreateEconomy, formatNumber } = require("../../util/economyUtils");
const config = require("../../config.js");

module.exports = {
  name: "daily",
  description: "Klaim hadiah souls harian kamu",
  category: "economy",
  usage: "daily",
  async exec(client, message) {
    try {
      const userId = message.author.id;
      const guildId = message.guild.id;

      // Ambil data ekonomi user
      const economy = await getOrCreateEconomy(userId, guildId);

      const now = Date.now();
      const cooldown = 24 * 60 * 60 * 1000; // 24 jam
      const lastClaim = economy.lastDaily || 0;

      // Cek apakah masih cooldown
      if (now - lastClaim < cooldown) {
        const remaining = cooldown - (now - lastClaim);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        const cooldownEmbed = new EmbedBuilder()
          .setTitle("⏳ Sudah Diklaim")
          .setDescription(`Kamu sudah mengklaim hadiah harian hari ini!`)
          .setColor(config.colors?.warning || "#FEE75C")
          .addFields(
            { name: "⏰ Waktu Tersisa", value: `**${hours}** jam **${minutes}** menit **${seconds}** detik`, inline: false }
          )
          .setFooter({ text: "Kembali lagi besok!" })
          .setTimestamp();

        return message.reply({ embeds: [cooldownEmbed] });
      }

      // Tentukan jumlah hadiah dari config atau default
      const minReward = config.features?.economy?.dailyMin || 100;
      const maxReward = config.features?.economy?.dailyMax || 500;
      const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

      // Tambahkan souls ke saldo user
      economy.cash += reward;
      economy.lastDaily = now;
      
      // Track streak
      const lastClaimDate = new Date(lastClaim).toDateString();
      const yesterdayDate = new Date(now - 86400000).toDateString();
      
      if (lastClaimDate === yesterdayDate) {
        economy.dailyStreak = (economy.dailyStreak || 0) + 1;
      } else if (lastClaim === 0) {
        economy.dailyStreak = 1;
      } else {
        economy.dailyStreak = 1; // Reset streak
      }
      
      await economy.save();

      const soulsEmoji = config.emojis?.souls || "💰";
      
      const successEmbed = new EmbedBuilder()
        .setTitle("🎁 Hadiah Harian Diklaim!")
        .setDescription(`Selamat! Kamu mendapatkan hadiah harian!`)
        .setColor(config.colors?.success || "#57F287")
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: `${soulsEmoji} Hadiah`, value: `**+${formatNumber(reward)}** souls`, inline: true },
          { name: "🔥 Streak", value: `**${economy.dailyStreak}** hari`, inline: true },
          { name: "💰 Total Saldo", value: `**${formatNumber(economy.cash)}** souls`, inline: true }
        )
        .setFooter({ 
          text: `Klaim lagi dalam 24 jam • ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("[daily] Error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat mengklaim hadiah harian!`);
    }
  },
};
