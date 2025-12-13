const VoiceEvent = require("../../schemas/VoiceEvent");

module.exports = {
  name: "vreset",
  description: "Reset semua data voice event di server ini (admin only)",
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }
    const guildId = message.guild.id;
    try {
      await VoiceEvent.deleteMany({ guildId });
      message.channel.send("✅ Semua data voice event di server ini telah direset.");
    } catch (err) {
      console.error("Error resetting voice event data:", err);
      message.channel.send("❌ Gagal mereset data voice event.");
    }
  },
};
