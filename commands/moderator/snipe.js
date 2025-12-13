const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "snipe",
  description: "Menampilkan pesan terakhir yang dihapus di channel ini (khusus dengan izin ManageMessages).",

  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
const config = require('../../config.js');
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'moderator');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const snipe = client.snipes.get(message.channel.id);
    if (!snipe) return message.reply(`${config.emojis.important} **|** Tidak ada pesan yang dihapus di channel ini.`);

    const embed = new EmbedBuilder()
      .setAuthor({ name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL({ dynamic: true }) })
      .setDescription(snipe.content || "*Pesan kosong atau hanya berisi media*")
      .setFooter({ text: `Dikirim pada` })
      .setTimestamp(snipe.time)
      .setColor(0xff5555);

    if (snipe.image) {
      embed.setImage(snipe.image);
    }

    message.channel.send({ embeds: [embed] });
  },
};
