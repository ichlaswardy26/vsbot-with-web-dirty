const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "tiket",
  aliases: ["sendticket", "ticketbutton", "ticket"],
  description: "Mengirim tombol buat tiket ke channel ini",
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
      .setTitle(`${ticketEmoji} Seraphyx Help Desk`)
      .setDescription(
        `Selamat datang di **Help Desk**!\n\n` +
        `Klik tombol di bawah ini dan pilih subject untuk membuat tiket.\n\n` +
        `**📋 Daftar Subject:**\n` +
        `> ${questionEmoji} **Pertanyaan** - Tanya seputar server\n` +
        `> ${reportEmoji} **Report** - Laporkan member/masalah\n` +
        `> ${banEmoji} **Ban Appeal** - Ajukan banding ban\n\n` +
        `*Staff akan merespon tiket kamu secepatnya!*`
      )
      .setColor(config.colors?.primary || "#5865F2")
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ 
        text: "© 2025 Villain Seraphyx",
        iconURL: client.user.displayAvatarURL()
      });

    await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    // Send confirmation and then delete both messages
    const confirmMsg = await message.channel.send(`${config.emojis?.check || "✅"} **|** Panel tiket berhasil dikirim!`);
    
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
