const Giveaway = require("../../schemas/Giveaway");
const { endGiveaway } = require("../../handlers/giveawayHandler");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "giveaway-end",
  aliases: ["gend"],
  description: "Akhiri giveaway sekarang.",
  category: "giveaway",
  usage: "giveaway-end <messageId>",
  async exec(client, message, args) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'giveaway');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const crossEmoji = config.emojis?.cross || "❌";
    const warningEmoji = config.emojis?.warning || "⚠️";

    const messageId = args[0];
    if (!messageId) {
      return message.reply(`${warningEmoji} **|** Berikan messageId giveaway.`);
    }

    try {
      const g = await Giveaway.findOne({ messageId });
      if (!g) {
        return message.reply(`${crossEmoji} **|** Giveaway tidak ditemukan.`);
      }

      if (g.ended) {
        return message.reply(`${warningEmoji} **|** Giveaway sudah berakhir.`);
      }

      await endGiveaway(client, g);
    } catch (error) {
      console.error("[giveaway-end] Error:", error.message);
      return message.reply(`${crossEmoji} **|** Terjadi kesalahan saat mengakhiri giveaway.`);
    }
  }
};
