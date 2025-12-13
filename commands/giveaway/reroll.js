const { rerollGiveaway } = require("../../handlers/giveawayHandler");

module.exports = {
  name: "giveaway-reroll",
  description: "Reroll winners from a giveaway message. Usage: giveaway-reroll <messageId>",
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'giveaway');
    if (permissionError) {
      return message.reply(permissionError);
    }
    const messageId = args[0];
    if (!messageId) return message.reply("Berikan messageId giveaway.");

    const res = await rerollGiveaway(client, messageId);
    if (!res.ok) return message.reply(`❌ Gagal: ${res.reason}`);
//    return message.reply(`✅ Reroll selesai. Winners selected.`);
  }
};
