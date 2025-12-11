const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  name: "tiket",
  aliases: ["sendticket", "ticketbutton"],
  description: "Mengirim tombol buat tiket ke channel ini (hanya admin)",

  async exec(client, message, args) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu tidak punya izin untuk menggunakan perintah ini.");
    }

    const button = new ButtonBuilder()
      .setCustomId("create_ticket")
      .setLabel("Buat Tiket")
      .setEmoji("<:ticketw:1368186624386797608>")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
      .setDescription(
        `## Welcome to Seraphyx Help Desk.\n\nKlik tombol dibawah ini dan pilih subject untuk membuat tiket.\nSubject List:\n<:question:1368184769724022894> = Pertanyaan\n<:report:1368185154366869586> = Report\n<:ban:1368184860924973237> = Ban Appeal`
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