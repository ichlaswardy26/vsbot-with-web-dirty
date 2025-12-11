const ConfessionState = require("../../schemas/ConfessionState");

module.exports = {
  name: "resetconfessionstate",
  aliases: ["resetconfess"],
  description: "Reset state confession terakhir untuk server ini.",
  async exec(client, message, args) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu harus menjadi admin untuk menggunakan perintah ini.");
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