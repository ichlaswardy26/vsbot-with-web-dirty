const { getOrCreateEconomy, formatNumber } = require("../../util/economyUtils");

module.exports = {
  name: "daily",
  description: "Klaim hadiah souls harian kamu",
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

      // Tentukan jumlah hadiah
      const minReward = 1;
      const maxReward = 1000;
      const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

      // Tambahkan souls ke saldo user
      economy.cash += reward;
      economy.lastDaily = now;
      await economy.save();

      message.reply(`💀 **|** Kamu mendapatkan **${formatNumber(reward)} souls** sebagai hadiah harian!\n<:blank:1367401175355359324> **|** Sekarang kamu memiliki **${formatNumber(economy.cash)} souls**.`);
    } catch (error) {
      console.error("Error in daily command:", error);
      message.reply("⚠️ Terjadi kesalahan saat mengklaim hadiah harian!");
    }
  },
};
