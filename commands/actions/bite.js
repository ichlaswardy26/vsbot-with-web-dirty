const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "bite",
  aliases: ["gigit"],
  description: "Gigit seseorang!",
  category: "action",
  usage: "bite @user",
  async exec(client, message) {
    const target = message.mentions.users.first();
    
    if (!target) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Mention seseorang yang ingin kamu gigit!`);
    }
    
    if (target.id === client.user.id) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Jangan gigit aku! 😱`);
    }
    
    if (target.id === message.author.id) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Kamu tidak bisa menggigit dirimu sendiri!`);
    }

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/bite", { timeout: 10000 });

      const embed = new EmbedBuilder()
        .setColor(config.colors?.error || "#ED4245")
        .setDescription(`😬 **${message.author.username}** menggigit **${target.username}**!`)
        .setImage(response.data.url)
        .setFooter({ 
          text: `Diminta oleh ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[bite] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
    }
  },
};
