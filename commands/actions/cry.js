const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "cry",
  aliases: ["nangis", "sedih"],
  description: "Menangis!",
  category: "action",
  usage: "cry",
  async exec(client, message) {
    try {
      const response = await axios.get("https://api.waifu.pics/sfw/cry", { timeout: 10000 });

      const embed = new EmbedBuilder()
        .setColor(config.colors?.info || "#5865F2")
        .setDescription(`😢 **${message.author.username}** sedang menangis...`)
        .setImage(response.data.url)
        .setFooter({ 
          text: `Jangan sedih ya~ • ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[cry] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
    }
  },
};
