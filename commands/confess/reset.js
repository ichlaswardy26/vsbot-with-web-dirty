const ConfessionState = require("../../schemas/ConfessionState");

module.exports = {
  name: "resetconfessionstate",
  aliases: ["resetconfess"],
  description: "Reset state confession terakhir untuk server ini.",
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const guildId = message.guild.id;

    try {
      // Hapus dari DB dan memory
      await ConfessionState.deleteOne({ guildId });
      client.lastConfessionMessage.delete(guildId);

      return message.reply("✅ State confession berhasil di-reset!");
    } catch (err) {
      console.error("Error saat reset state confession:", err);
      return message.reply("❌ Terjadi kesalahan saat reset state.");
    }
  },
};