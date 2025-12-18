const ConfessionState = require("../../schemas/ConfessionState");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "resetconfessionstate",
  aliases: ["resetconfess"],
  description: "Reset state confession terakhir untuk server ini.",
  category: "confess",
  usage: "resetconfess",
  async exec(client, message) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const guildId = message.guild.id;

    try {
      // Hapus dari DB dan memory
      await ConfessionState.deleteOne({ guildId });
      client.lastConfessionMessage?.delete(guildId);

      return message.reply("✅ State confession berhasil di-reset!");
    } catch (err) {
      console.error("[resetconfess] Error:", err.message);
      return message.reply("❌ Terjadi kesalahan saat reset state.");
    }
  },
};