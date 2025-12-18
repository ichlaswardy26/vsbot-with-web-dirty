const Activity = require("../../schemas/Activity");
const VoiceActivity = require("../../schemas/VoiceActivity");
const { EmbedBuilder } = require("discord.js");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "reset",
  description: "Reset semua data Activity (chat & voice)",
  category: "admin",
  async exec(client, message) {
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(config.colors?.warning || '#FEE75C')
      .setTitle('⏳ Memproses...')
      .setDescription('Sedang mereset semua data Activity...')
      .setTimestamp();

    const confirmMsg = await message.channel.send({ embeds: [loadingEmbed] });

    try {
      const chatResult = await Activity.deleteMany({ guildId: message.guild.id });
      const voiceResult = await VoiceActivity.deleteMany({ guildId: message.guild.id });

      const successEmbed = new EmbedBuilder()
        .setColor(config.colors?.success || '#57F287')
        .setTitle(`${config.emojis?.check || '✅'} Reset Activity Selesai`)
        .setDescription('Semua data chat & voice activity berhasil dihapus.')
        .addFields(
          { name: '💬 Chat Activity', value: `${chatResult.deletedCount} record`, inline: true },
          { name: '🎙️ Voice Activity', value: `${voiceResult.deletedCount} record`, inline: true }
        )
        .setFooter({ text: `Direset oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      await confirmMsg.edit({ embeds: [successEmbed] });
    } catch (error) {
      console.error("Error resetting activity:", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
        .setDescription('Gagal mereset data Activity. Silakan coba lagi.')
        .setTimestamp();
      await confirmMsg.edit({ embeds: [errorEmbed] });
    }
  },
};
