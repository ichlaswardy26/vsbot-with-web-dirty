const ExclusiveItem = require("../../schemas/ExclusiveItem");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "additem",
  description: "Tambah item exclusive baru (nama di akhir argumen)",
  category: "shop",
  usage: "additem <harga> <slot> <durasiHari> <namaItem>",
  async exec(client, message, args) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    // Ambil argumen
    const price = parseInt(args[0]);
    const slots = parseInt(args[1]);
    const duration = parseInt(args[2]);
    const name = args.slice(3).join(" "); // nama item bisa lebih dari 1 kata

    // Validasi argumen
    if (isNaN(price) || isNaN(slots) || isNaN(duration) || !name) {
      return message.reply(
        `${config.emojis?.warning || "⚠️"} Gunakan format:\n\`..additem <harga> <slot> <durasiHari> <namaItem>\`\n\nContoh:\n\`..additem 1000 2 10 Owo Cash\``
      );
    }

    try {
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

      const soulsEmoji = config.emojis?.souls || "💰";

      // Kirim embed konfirmasi
      const embed = new EmbedBuilder()
        .setTitle("🌟 Item Exclusive Ditambahkan")
        .setColor(config.colors?.warning || 0xffd700)
        .setDescription(
          `📦 **Nama:** ${name}\n${soulsEmoji} **Harga:** ${price}\n🎟️ **Slot:** ${slots}\n⏳ **Berakhir:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`
        )
        .setFooter({
          text: `Ditambahkan oleh ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[additem] Error:", error.message);
      message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat menambahkan item!`);
    }
  },
};
