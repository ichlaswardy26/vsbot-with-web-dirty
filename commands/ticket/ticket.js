const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: "tiket",
  aliases: ["sendticket", "ticketbutton"],
  description: "Mengirim tombol buat tiket ke channel ini (hanya admin)",

  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const button = new ButtonBuilder()
      .setCustomId("create_ticket")
      .setLabel("Buat Tiket")
      .setEmoji(config.emojis.ticket)
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
      .setDescription(
        `## Welcome to Seraphyx Help Desk.\n\nKlik tombol dibawah ini dan pilih subject untuk membuat tiket.\nSubject List:\n${config.emojis.question} = Pertanyaan\n${config.emojis.report} = Report\n${config.emojis.ban} = Ban Appeal`
      ) // 🟢 Partnership dihapus
      .setColor('White');

    await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    // Send confirmation and then delete both messages
    const confirmMsg = await message.channel.send("✅ Tombol tiket telah dikirim.");
    
    // Delete the original command message and confirmation after a short delay
    setTimeout(async () => {
      try {
        await message.delete();
        await confirmMsg.delete();
      } catch (error) {
        console.error('Error deleting messages:', error);
      }
    }, 3000);
  },
};