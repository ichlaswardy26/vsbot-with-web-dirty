const Economy = require("../../schemas/UserBalance");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "resetcurrency",
  aliases: ["resetcash", "resetsouls"],
  description: "Reset semua saldo souls atau milik satu user saja",
  category: "economy",
  usage: "resetsouls [@user]",
  async exec(client, message) {
    try {
      // Check permission using standardized system
      const permissionError = rolePermissions.checkPermission(message.member, 'economy');
      if (permissionError) {
        return message.reply(permissionError);
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
          return message.reply(`${config.emojis?.check || "✅"} Saldo ${targetUser} telah direset ke **0 souls**.`);
        } else {
          return message.reply(`${config.emojis?.warning || "⚠️"} Tidak ditemukan data ekonomi untuk ${targetUser}.`);
        }
      } else {
        // Reset seluruh server
        await Economy.updateMany({ guildId: message.guild.id }, { $set: { cash: 0 } });
        return message.reply("💀 Semua saldo souls di server ini telah direset ke **0**.");
      }
    } catch (error) {
      console.error("[resetsouls] Error:", error.message);
      return message.reply(`${config.emojis?.warning || "⚠️"} Terjadi kesalahan saat mereset saldo!`);
    }
  },
};
