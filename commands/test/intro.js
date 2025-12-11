const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "intro",
  async exec(client, message) {
    const introEmbed = new EmbedBuilder()
      .setTitle("✧・゜: *Introduction Form* :・゜✧")
      .setDescription("Silakan klik tombol di bawah untuk memperkenalkan diri kamu!")
      .addFields(
        { 
          name: "📝 Form akan menanyakan:", 
          value: "```md\n1. Nama\n2. Age\n3. Gender\n4. Hobby\n5. Note```",
          inline: false 
        }
      )
      .setColor("#FF69B4")
      .setFooter({ text: "Villain Seraphyx" });

    const button = new ButtonBuilder()
      .setCustomId("submit_intro")
      .setLabel("📝 Isi Form Intro")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✨");

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({
      embeds: [introEmbed],
      components: [row]
    });
  },
};
