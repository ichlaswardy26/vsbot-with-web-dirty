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

        return message.reply(
          `⏳ **|** Kamu sudah klaim hadiah harian! Coba lagi dalam **${hours} jam ${minutes} menit ${seconds} detik**.`
        );
      }

      // Tentukan jumlah hadiah dari config atau default
      const minReward = config.features?.economy?.dailyMin || 1;
      const maxReward = config.features?.economy?.dailyMax || 1000;
      const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

      // Tambahkan souls ke saldo user
      economy.cash += reward;
      economy.lastDaily = now;
      await economy.save();

      const blankEmoji = config.emojis?.blank || "⠀";
      message.reply(`💀 **|** Kamu mendapatkan **${formatNumber(reward)} souls** sebagai hadiah harian!\n${blankEmoji} **|** Sekarang kamu memiliki **${formatNumber(economy.cash)} souls**.`);
    } catch (error) {
      console.error("[daily] Error:", error.message);
      message.reply(`${config.emojis?.warning || "⚠️"} Terjadi kesalahan saat mengklaim hadiah harian!`);
    }
  },
};
