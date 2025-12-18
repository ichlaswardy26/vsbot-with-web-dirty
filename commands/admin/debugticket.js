const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "debugticket",
  description: "Debug konfigurasi ticket",
  category: "admin",
  
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    const config = require('../../config');
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const botConfig = client.config;
    
    const embed = new EmbedBuilder()
      .setTitle("🔧 Debug Konfigurasi Ticket")
      .setColor(config.colors?.primary || '#5865F2')
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields(
        { 
          name: "ID Role Staff", 
          value: `${botConfig.roles?.staff || 'Tidak diatur'}`, 
          inline: true 
        },
        { 
          name: "ID Kategori Ticket", 
          value: `${botConfig.categories?.ticket || 'Tidak diatur'}`, 
          inline: true 
        },
        { 
          name: "ID Channel Log Ticket", 
          value: `${botConfig.channels?.ticketLogs || 'Tidak diatur'}`, 
          inline: true 
        },
        {
          name: "Role Pengguna",
          value: message.member.roles.cache.map(r => `${r.name} (${r.id})`).slice(0, 10).join('\n') || 'Tidak ada role',
          inline: false
        }
      )
      .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
