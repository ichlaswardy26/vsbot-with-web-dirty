const ExclusiveItem = require("../../schemas/ExclusiveItem");

module.exports = {
  name: "done",
  description: "Konfirmasi pembelian item exclusive oleh admin",
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    // ambil user mention dan nama item
    const user = message.mentions.users.first();
    const itemName = args.slice(1).join(" ");

    if (!user || !itemName) {
      return message.reply("⚠️ Gunakan format: `..done @user <nama item>`");
    }

    // cari item berdasarkan nama
    const item = await ExclusiveItem.findOne({
      guildId: message.guild.id,
      name: itemName,
    });

    if (!item) {
      return message.reply(`❌ Item **${itemName}** tidak ditemukan.`);
    }

    // cek apakah user ada di daftar pembeli
    if (!item.buyers.includes(user.id)) {
      return message.reply(`⚠️ ${user.tag} belum membeli item **${item.name}**.`);
    }

    // jika sudah dikonfirmasi sebelumnya (buat field baru optional)
    if (!item.confirmedBuyers) item.confirmedBuyers = [];
    if (item.confirmedBuyers.includes(user.id)) {
      return message.reply(`ℹ️ Pembelian oleh ${user.tag} untuk **${item.name}** sudah dikonfirmasi sebelumnya.`);
    }

    // tambahkan ke daftar confirmed
    item.confirmedBuyers.push(user.id);
    await item.save();

    // kirim pesan konfirmasi
    return message.channel.send(
      `✅ Pembelian oleh **${user.tag}** untuk item **${item.name}** telah dikonfirmasi!\n(Slot tetap sama — tidak berkurang)`
    );
  },
};
