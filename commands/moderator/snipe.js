const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "snipe",
  description: "Menampilkan pesan terakhir yang dihapus di channel ini",
  category: "moderator",
  usage: "snipe",

  async exec(client, message) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'moderator');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const snipe = client.snipes?.get(message.channel.id);
    if (!snipe) {
      const noSnipeEmbed = new EmbedBuilder()
        .setTitle("🔍 Tidak Ada Pesan")
        .setDescription("Tidak ada pesan yang dihapus baru-baru ini di channel ini.")
        .setColor(config.colors?.warning || "#FEE75C")
        .setFooter({ text: `Diminta oleh ${message.author.username}` })
        .setTimestamp();
        
      return message.channel.send({ embeds: [noSnipeEmbed] });
    }

    const embed = new EmbedBuilder()
      .setTitle("🔍 Pesan Terhapus")
      .setAuthor({ 
        name: snipe.author.tag, 
        iconURL: snipe.author.displayAvatarURL({ dynamic: true }) 
      })
      .setDescription(snipe.content || "*Pesan kosong atau hanya berisi media*")
      .addFields(
        { name: "📁 Channel", value: `${message.channel}`, inline: true },
        { name: "⏰ Waktu", value: `<t:${Math.floor(snipe.time.getTime() / 1000)}:R>`, inline: true }
      )
      .setColor(config.colors?.error || "#ED4245")
      .setFooter({ 
        text: `Diminta oleh ${message.author.username}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTimestamp();

    if (snipe.image) {
      embed.setImage(snipe.image);
    }

    message.channel.send({ embeds: [embed] });
  },
};
