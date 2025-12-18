const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "cringe",
  description: "Cringe!",
  category: "action",
  usage: "cringe",
  async exec(client, message) {
    try {
      const response = await axios.get("https://api.waifu.pics/sfw/cringe", { timeout: 10000 });

      const embed = new EmbedBuilder()
        .setColor(config.colors?.warning || "#FEE75C")
        .setDescription(`😬 **${message.author.username}** merasa cringe...`)
        .setImage(response.data.url)
        .setFooter({ 
          text: `Diminta oleh ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[cringe] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
    }
  },
};
