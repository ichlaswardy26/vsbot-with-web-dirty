const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "tiket",
  aliases: ["sendticket", "ticketbutton"],
  description: "Mengirim tombol buat tiket ke channel ini (hanya admin)",
  category: "ticket",
  usage: "tiket",

  async exec(client, message) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const ticketEmoji = config.emojis?.ticket || "🎫";
    const questionEmoji = config.emojis?.question || "❓";
    const reportEmoji = config.emojis?.report || "📢";
    const banEmoji = config.emojis?.ban || "🔨";

    const button = new ButtonBuilder()
      .setCustomId("create_ticket")
      .setLabel("Buat Tiket")
      .setEmoji(ticketEmoji)
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
      .setDescription(
        `## Welcome to Seraphyx Help Desk.\n\nKlik tombol dibawah ini dan pilih subject untuk membuat tiket.\nSubject List:\n${questionEmoji} = Pertanyaan\n${reportEmoji} = Report\n${banEmoji} = Ban Appeal`
      )
      .setColor('White');

    await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    // Send confirmation and then delete both messages
    const confirmMsg = await message.channel.send(`${config.emojis?.check || "✅"} Tombol tiket telah dikirim.`);
    
    // Delete the original command message and confirmation after a short delay
    setTimeout(async () => {
      try {
        await message.delete().catch(() => {});
        await confirmMsg.delete().catch(() => {});
      } catch (error) {
        console.error('[ticket] Error deleting messages:', error.message);
      }
    }, 3000);
  },
};