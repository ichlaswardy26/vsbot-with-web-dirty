const { EmbedBuilder } = require("discord.js");
const ConfessionState = require("../../schemas/ConfessionState");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "resetconfessionstate",
  aliases: ["resetconfess"],
  description: "Reset state confession terakhir untuk server ini",
  category: "confess",
  usage: "resetconfess",
  async exec(client, message) {
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const guildId = message.guild.id;

    try {
      await ConfessionState.deleteOne({ guildId });
      client.lastConfessionMessage?.delete(guildId);

      const successEmbed = new EmbedBuilder()
        .setColor(config.colors?.success || '#57F287')
        .setTitle(`${config.emojis?.check || '✅'} State Confession Direset`)
        .setDescription('State confession berhasil di-reset untuk server ini.')
        .setFooter({ text: `Direset oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [successEmbed] });
    } catch (err) {
      console.error("[resetconfess] Error:", err.message);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
        .setDescription('Gagal mereset state confession. Silakan coba lagi.')
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }
  },
};