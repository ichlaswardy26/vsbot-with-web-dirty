const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "dance",
  description: "Dance!",
  category: "action",
  usage: "dance",
  async exec(client, message) {
    try {
      const response = await axios.get("https://api.waifu.pics/sfw/dance");

      const embed = new EmbedBuilder()
        .setColor(config.colors?.primary || "#FFC0CB")
        .setDescription(`${message.author.username} dance!`)
        .setImage(response.data.url);

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[dance] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF dari API.`);
    }
  },
};