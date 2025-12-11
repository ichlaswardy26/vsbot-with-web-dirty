const ExclusiveItem = require("../../schemas/ExclusiveItem");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "additem",
  description: "Tambah item exclusive baru (nama di akhir argumen)",
  async exec(client, message, args) {
    // Cek izin admin
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu tidak punya izin untuk menjalankan perintah ini!");
    }

    // Ambil argumen
    const price = parseInt(args[0]);
    const slots = parseInt(args[1]);
    const duration = parseInt(args[2]);
    const name = args.slice(3).join(" "); // nama item bisa lebih dari 1 kata

    // Validasi argumen
    if (isNaN(price) || isNaN(slots) || isNaN(duration) || !name) {
      return message.reply(
        "⚠️ Gunakan format:\n`..additem <harga> <slot> <durasiHari> <namaItem>`\n\nContoh:\n`..additem 1000 2 10 Owo Cash`"
      );
    }

    // Hitung waktu berakhir
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Simpan ke database
    await ExclusiveItem.create({
      guildId: message.guild.id,
      name,
      price,
      slots,
      expiresAt,
    });

    // Kirim embed konfirmasi
    const embed = new EmbedBuilder()
      .setTitle("🌟 Item Exclusive Ditambahkan")
      .setColor(0xffd700)
      .setDescription(
        `📦 **Nama:** ${name}\n<:souls:1373202161823121560> **Harga:** ${price}\n🎟️ **Slot:** ${slots}\n⏳ **Berakhir:** <t:${Math.floor(
          expiresAt.getTime() / 1000
        )}:R>`
      )
      .setFooter({
        text: `Ditambahkan oleh ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
