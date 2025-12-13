const Activity = require("../../schemas/Activity");
const VoiceActivity = require("../../schemas/VoiceActivity");
const { EmbedBuilder } = require("discord.js");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "reset",
  description: "🔴 Reset semua data Activity (chat & voice)",
  category: "admin",
  async exec(client, message, args) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    // Konfirmasi
    const confirmMsg = await message.channel.send("⚠️ Sedang mereset semua data Activity...");

    try {
      // Reset semua data chat activity
      await Activity.deleteMany({ guildId: message.guild.id });

      // Reset semua data voice activity
      await VoiceActivity.deleteMany({ guildId: message.guild.id });

      // Embed sukses
      const embed = new EmbedBuilder()
        .setTitle("✅ Reset Activity Selesai")
        .setDescription("Semua data chat & voice activity berhasil dihapus.")
        .setColor("Green")
        .setTimestamp();

      await confirmMsg.edit({ content: null, embeds: [embed] });
    } catch (error) {
      console.error("Error resetting activity:", error);
      await confirmMsg.edit("❌ Terjadi kesalahan saat mereset data Activity.");
    }
  },
};
