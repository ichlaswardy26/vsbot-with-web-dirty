const Economy = require("../../schemas/UserBalance");

module.exports = {
  name: "resetcurrency",
  aliases: ["resetcash", "resetsouls"],
  description: "Reset semua saldo souls atau milik satu user saja",
  usage: "[mention optional]",
  async exec(client, message, args) {
    try {
      // Pastikan hanya admin yang bisa pakai command
      if (!message.member.permissions.has("Administrator")) {
        return message.reply("❌ Kamu tidak punya izin untuk menggunakan perintah ini!");
      }

      const targetUser = message.mentions.users.first();

      if (targetUser) {
        // Reset saldo 1 user
        const result = await Economy.findOneAndUpdate(
          { userId: targetUser.id, guildId: message.guild.id },
          { cash: 0 },
          { new: true }
        );

        if (result) {
          return message.reply(`✅ Saldo ${targetUser} telah direset ke **0 souls**.`);
        } else {
          return message.reply(`⚠️ Tidak ditemukan data ekonomi untuk ${targetUser}.`);
        }
      } else {
        // Reset seluruh server
        await Economy.updateMany({ guildId: message.guild.id }, { $set: { cash: 0 } });
        return message.reply("💀 Semua saldo souls di server ini telah direset ke **0**.");
      }
    } catch (error) {
      console.error("Error in resetcurrency command:", error);
      return message.reply("⚠️ Terjadi kesalahan saat mereset saldo!");
    }
  },
};
