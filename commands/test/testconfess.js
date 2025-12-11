const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: "testconfess",
  description: "Test confession system",
  
  async exec(client, message, args) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu tidak punya izin untuk menggunakan perintah ini.");
    }

    const embed = new EmbedBuilder()
      .setTitle("📝 Confession System")
      .setDescription("Klik tombol di bawah untuk mengirim confession atau reply secara anonim.")
      .setColor(0x5865F2)
      .setFooter({ text: "Semua confession akan dikirim secara anonim" });

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("submit_confession")
        .setLabel("📝 Submit Confession")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("reply_confession")
        .setLabel("💬 Reply to Confession")
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({
      embeds: [embed],
      components: [buttonRow],
    });

    // Delete original command message
    try {
      await message.delete();
    } catch (error) {
      console.error('Failed to delete original message:', error);
    }
  }
};