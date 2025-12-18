const { rerollGiveaway } = require("../../handlers/giveawayHandler");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "giveaway-reroll",
  aliases: ["greroll"],
  description: "Reroll winners dari giveaway.",
  category: "giveaway",
  usage: "giveaway-reroll <messageId>",
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
      const res = await rerollGiveaway(client, messageId);
      if (!res.ok) {
        return message.reply(`${crossEmoji} **|** Gagal: ${res.reason}`);
      }
    } catch (error) {
      console.error("[giveaway-reroll] Error:", error.message);
      return message.reply(`${crossEmoji} **|** Terjadi kesalahan saat reroll giveaway.`);
    }
  }
};
