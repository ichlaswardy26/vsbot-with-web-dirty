const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "dance",
  aliases: ["joget", "menari"],
  description: "Menari!",
  category: "action",
  usage: "dance",
  async exec(client, message) {
    try {
      const response = await axios.get("https://api.waifu.pics/sfw/dance", { timeout: 10000 });

      const embed = new EmbedBuilder()
        .setColor(config.colors?.success || "#57F287")
        .setDescription(`💃 **${message.author.username}** sedang menari!`)
        .setImage(response.data.url)
        .setFooter({ 
          text: `Ayo ikut menari~ • ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[dance] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
    }
  },
};
