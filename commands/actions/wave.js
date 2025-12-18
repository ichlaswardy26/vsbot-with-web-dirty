const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "wave",
  aliases: ["lambai"],
  description: "Melambaikan tangan!",
  category: "action",
  usage: "wave [@user]",
  async exec(client, message) {
    const target = message.mentions.users.first();

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/wave", { timeout: 10000 });

      const description = target 
        ? `👋 **${message.author.username}** melambaikan tangan ke **${target.username}**!`
        : `👋 **${message.author.username}** melambaikan tangan!`;

      const embed = new EmbedBuilder()
        .setColor(config.colors?.success || "#57F287")
        .setDescription(description)
        .setImage(response.data.url)
        .setFooter({ 
          text: `Diminta oleh ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[wave] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
    }
  },
};
