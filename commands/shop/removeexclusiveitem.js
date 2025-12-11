const ExclusiveItem = require("../../schemas/ExclusiveItem");

module.exports = {
  name: "ritem",
  description: "Hapus item exclusive dari database berdasarkan nama (dengan konfirmasi)",
  usage: "ritem <nama_item>",
  async exec(client, message, args) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu tidak punya izin untuk menghapus item!");
    }

    const name = args && args.length ? args.join(" ") : null;
    if (!name) {
      return message.reply("⚠️ Masukkan nama item exclusive yang ingin dihapus. Contoh: `..ritem Nama Item`.");
    }

    // Cari item exclusive berdasarkan nama (case-insensitive)
    const item = await ExclusiveItem.findOne({ 
      guildId: message.guild.id, 
      name: { $regex: new RegExp(`^${name}$`, "i") } 
    });
    
    if (!item) {
      return message.reply(`⚠️ Tidak ditemukan item exclusive dengan nama: **${name}**.`);
    }

    // Kirim pesan konfirmasi interaktif
    await message.reply(
      `Ketik \`confirm\` untuk menghapus item **${item.name}**, atau ketik \`cancel\` untuk membatalkan penghapusan. (30 detik)`
    );

    // Tunggu balasan admin
    const filter = (m) => m.author.id === message.author.id && ["confirm", "cancel"].includes(m.content.trim().toLowerCase());
    try {
      const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] });
      const response = collected.first().content.trim().toLowerCase();
      if (response === "confirm") {
        await ExclusiveItem.deleteOne({ _id: item._id });
        await message.channel.send(`✅ Berhasil menghapus item **${item.name}** dari database.`);
      } else {
        await message.channel.send("❌ Penghapusan item dibatalkan.");
      }
    } catch (e) {
      await message.channel.send("⏰ Waktu konfirmasi habis, item tidak dihapus.");
    }
  },
};
