const Giveaway = require("../../schemas/Giveaway");
const { endGiveaway } = require("../../handlers/giveawayHandler");

module.exports = {
  name: "giveaway-end",
  description: "Akhiri giveaway sekarang (admin). Usage: giveaway-end <messageId>",
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'giveaway');
    if (permissionError) {
      return message.reply(permissionError);
    }
    const messageId = args[0];
    if (!messageId) return message.reply("Berikan messageId giveaway.");

    const g = await Giveaway.findOne({ messageId });
    if (!g) return message.reply("Giveaway tidak ditemukan.");

    if (g.ended) return message.reply("Giveaway sudah berakhir.");

    await endGiveaway(client, g);
//    return message.reply("✅ Giveaway diakhiri.");
  }
};
