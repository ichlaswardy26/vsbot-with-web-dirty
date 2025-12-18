const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "kiss",
  aliases: ["cium"],
  description: "Cium seseorang!",
  category: "action",
  usage: "kiss @user",
  async exec(client, message) {
    const target = message.mentions.users.first();
    
    if (!target) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Mention seseorang yang ingin kamu cium!`);
    }
    
    if (target.id === client.user.id) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Aku tidak bisa dicium~ 😳`);
    }
    
    if (target.id === message.author.id) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Kamu tidak bisa mencium dirimu sendiri!`);
    }

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/kiss", { timeout: 10000 });

      const embed = new EmbedBuilder()
        .setColor(config.colors?.primary || "#FF69B4")
        .setDescription(`💋 **${message.author.username}** mencium **${target.username}**!`)
        .setImage(response.data.url)
        .setFooter({ 
          text: `Diminta oleh ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[kiss] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
    }
  },
};
