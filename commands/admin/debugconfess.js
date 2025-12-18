const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: "debugconfess",
  description: "Debug konfigurasi sistem confession",
  category: "admin",
  
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const confessionChannelId = config.channels.confession;
    const logChannelId = config.channels.confessionLog;
    
    const confessionChannel = message.guild.channels.cache.get(confessionChannelId);
    const logChannel = message.guild.channels.cache.get(logChannelId);

    const embed = new EmbedBuilder()
      .setTitle("🔧 Debug Sistem Confession")
      .setColor(config.colors?.primary || '#5865F2')
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields(
        { 
          name: "Channel Confession", 
          value: confessionChannel ? `✅ Ditemukan: ${confessionChannel.name}` : "❌ Tidak ditemukan", 
          inline: true 
        },
        { 
          name: "Channel Log", 
          value: logChannel ? `✅ Ditemukan: ${logChannel.name}` : "❌ Tidak ditemukan", 
          inline: true 
        },
        { 
          name: "ID Channel", 
          value: `Confession: ${confessionChannelId || 'Tidak diatur'}\nLog: ${logChannelId || 'Tidak diatur'}`, 
          inline: false 
        }
      )
      .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
