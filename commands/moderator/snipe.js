const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "snipe",
  description: "Menampilkan pesan terakhir yang dihapus di channel ini (khusus dengan izin ManageMessages).",

  async exec(client, message) {
    // Cek permission
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("<a:important:1367186288297377834> **|** Kamu membutuhkan izin untuk menggunakan perintah ini.");
    }

    const snipe = client.snipes.get(message.channel.id);
    if (!snipe) return message.reply("<a:important:1367186288297377834> **|** Tidak ada pesan yang dihapus di channel ini.");

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
