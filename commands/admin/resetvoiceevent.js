const { EmbedBuilder } = require("discord.js");
const VoiceEvent = require("../../schemas/VoiceEvent");
const config = require("../../config.js");

module.exports = {
  name: "vreset",
  description: "Reset semua data voice event di server ini (admin only)",
  category: "admin",
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }
    
    const guildId = message.guild.id;
    try {
      const result = await VoiceEvent.deleteMany({ guildId });
      
      const successEmbed = new EmbedBuilder()
        .setColor(config.colors?.success || '#57F287')
        .setTitle(`${config.emojis?.check || '✅'} Data Voice Event Direset`)
        .setDescription('Semua data voice event di server ini telah direset.')
        .addFields(
          { name: '📊 Data Dihapus', value: `${result.deletedCount} record`, inline: true }
        )
        .setFooter({ text: `Direset oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
        
      message.channel.send({ embeds: [successEmbed] });
    } catch (err) {
      console.error("Error resetting voice event data:", err);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
        .setDescription('Gagal mereset data voice event.')
        .setTimestamp();
      message.channel.send({ embeds: [errorEmbed] });
    }
  },
};
