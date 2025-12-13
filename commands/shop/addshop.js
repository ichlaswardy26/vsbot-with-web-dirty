const ShopRole = require("../../schemas/ShopRole");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "addshop",
  description: "Tambah role ke shop",
  async exec(client, message, args) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    // Pastikan minimal argumen utama ada
    if (args.length < 3)
      return message.reply("⚠️ Gunakan: `..addshop <nama> <@role> <harga> --desk <deskripsi>`");

    const name = args[0]?.toLowerCase();
    const role = message.mentions.roles.first();
    const price = parseInt(args[2]);

    // Cek argumen wajib
    if (!name || !role || isNaN(price))
      return message.reply("⚠️ Gunakan: `..addshop <nama> <@role> <harga> --desk <deskripsi>`");

    // Ambil deskripsi (opsional)
    const deskIndex = args.indexOf("--desk");
    let description = "";
    if (deskIndex !== -1) {
      description = args.slice(deskIndex + 1).join(" ");
    }

    // Cek kalau nama sudah ada
    const exist = await ShopRole.findOne({ guildId: message.guild.id, name });
    if (exist) return message.reply(`⚠️ Nama \`${name}\` sudah dipakai di shop!`);

    // Simpan ke database
    await ShopRole.create({
      guildId: message.guild.id,
      name,
      roleId: role.id,
      price,
      description,
    });

    message.reply(
      `✅ Role ${role.name} ditambahkan ke shop!\n` +
      `📛 Nama: \`${name}\`\n💰 Harga: ${price}\n📝 Deskripsi: ${description || "_(tidak ada deskripsi)_"}`  
    );
  },
};
