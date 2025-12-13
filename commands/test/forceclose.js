const Ticket = require('../../schemas/Ticket');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "forceclose",
  description: "Force close current ticket (admin only)",
  
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    // Check if this is a ticket channel
    if (!message.channel.name.startsWith('ticket-') && !message.channel.name.startsWith('partner-')) {
      return message.reply("❌ Command ini hanya bisa digunakan di channel ticket.");
    }

    try {
      const ticket = await Ticket.findOne({ channelId: message.channel.id });
      
      if (!ticket) {
        return message.reply("❌ Tidak menemukan data tiket di database.");
      }

      // Update ticket status
      ticket.status = "closed";
      ticket.closedAt = new Date();
      await ticket.save();

      const embed = new EmbedBuilder()
        .setTitle("🔒 Tiket Ditutup Paksa")
        .setDescription(`Tiket ditutup oleh admin: ${message.author}`)
        .addFields(
          { name: "User", value: `<@${ticket.userId}>`, inline: true },
          { name: "Channel", value: `#${message.channel.name}`, inline: true },
          { name: "Dibuka", value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true }
        )
        .setColor(0xff3e3e)
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Delete channel after 5 seconds
      setTimeout(() => {
        message.channel.delete().catch(console.error);
      }, 5000);

    } catch (error) {
      console.error('Error force closing ticket:', error);
      message.reply("❌ Terjadi kesalahan saat menutup tiket.");
    }
  }
};