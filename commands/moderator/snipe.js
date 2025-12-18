const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "snipe",
  description: "Menampilkan pesan terakhir yang dihapus di channel ini.",
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
      return message.reply(`${config.emojis?.important || "❗"} **|** Tidak ada pesan yang dihapus di channel ini.`);
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL({ dynamic: true }) })
      .setDescription(snipe.content || "*Pesan kosong atau hanya berisi media*")
      .setFooter({ text: "Dikirim pada" })
      .setTimestamp(snipe.time)
      .setColor(config.colors?.error || 0xff5555);

    if (snipe.image) {
      embed.setImage(snipe.image);
    }

    message.channel.send({ embeds: [embed] });
  },
};
