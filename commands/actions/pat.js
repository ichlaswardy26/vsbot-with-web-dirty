const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.js");

module.exports = {
  name: "pat",
  aliases: ["tepuk", "headpat"],
  description: "Tepuk kepala seseorang!",
  category: "action",
  usage: "pat @user",
  async exec(client, message) {
    const target = message.mentions.users.first();
    
    if (!target) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Mention seseorang yang ingin kamu tepuk kepalanya!`);
    }
    
    if (target.id === client.user.id) {
      const embed = new EmbedBuilder()
        .setColor(config.colors?.primary || "#FFC0CB")
        .setDescription(`👋 **${message.author.username}** menepuk kepala bot! Terima kasih~ 🥰`)
        .setFooter({ text: `Diminta oleh ${message.author.username}` })
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }
    
    if (target.id === message.author.id) {
      return message.reply(`${config.emojis?.important || "❗"} **|** Kamu tidak bisa menepuk kepalamu sendiri!`);
    }

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/pat", { timeout: 10000 });

      const embed = new EmbedBuilder()
        .setColor(config.colors?.primary || "#FFC0CB")
        .setDescription(`👋 **${message.author.username}** menepuk kepala **${target.username}**!`)
        .setImage(response.data.url)
        .setFooter({ 
          text: `Diminta oleh ${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[pat] API error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Gagal mengambil GIF. Coba lagi nanti!`);
    }
  },
};
