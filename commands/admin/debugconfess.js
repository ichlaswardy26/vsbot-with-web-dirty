const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: "debugconfess",
  description: "Debug confession system configuration",
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
      .setTitle("🔧 Confession System Debug")
      .setColor(0x00ff00)
      .addFields(
        { 
          name: "Confession Channel", 
          value: confessionChannel ? `✅ Found: ${confessionChannel.name}` : "❌ Not found", 
          inline: true 
        },
        { 
          name: "Log Channel", 
          value: logChannel ? `✅ Found: ${logChannel.name}` : "❌ Not found", 
          inline: true 
        },
        { 
          name: "Channel IDs", 
          value: `Confession: ${confessionChannelId}\nLog: ${logChannelId}`, 
          inline: false 
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
