const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "debugticket",
  description: "Debug ticket configuration",
  category: "admin",
  
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const config = client.config;
    
    const embed = new EmbedBuilder()
      .setTitle("🔧 Ticket Configuration Debug")
      .setColor(0x00ff00)
      .addFields(
        { 
          name: "Staff Role ID", 
          value: `${config.roles?.staff || 'Not set'}`, 
          inline: true 
        },
        { 
          name: "Ticket Category ID", 
          value: `${config.categories?.ticket || 'Not set'}`, 
          inline: true 
        },
        { 
          name: "Ticket Log Channel ID", 
          value: `${config.channels?.ticketLogs || 'Not set'}`, 
          inline: true 
        },
        {
          name: "User Roles",
          value: message.member.roles.cache.map(r => `${r.name} (${r.id})`).slice(0, 10).join('\n') || 'No roles',
          inline: false
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
