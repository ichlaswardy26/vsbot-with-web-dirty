const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "debugticket",
  description: "Debug ticket configuration",
  
  async exec(client, message, args) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu tidak punya izin untuk menggunakan perintah ini.");
    }

    const config = client.config;
    
    const embed = new EmbedBuilder()
      .setTitle("🔧 Ticket Configuration Debug")
      .setColor(0x00ff00)
      .addFields(
        { 
          name: "Staff Role ID", 
          value: `New: ${config.roles?.staff || 'Not set'}\nOld: ${config.staffRoleId || 'Not set'}`, 
          inline: true 
        },
        { 
          name: "Ticket Category ID", 
          value: `New: ${config.categories?.ticket || 'Not set'}\nOld: ${config.ticketCategoryId || 'Not set'}`, 
          inline: true 
        },
        { 
          name: "Ticket Log Channel ID", 
          value: `New: ${config.channels?.ticketLogs || 'Not set'}\nOld: ${config.ticketLogChannelId || 'Not set'}`, 
          inline: true 
        },
        {
          name: "User Roles",
          value: message.member.roles.cache.map(r => `${r.name} (${r.id})`).join('\n') || 'No roles',
          inline: false
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};