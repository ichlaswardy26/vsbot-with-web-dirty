const ShopRole = require("../../schemas/ShopRole");

module.exports = {
  name: "addexclusive",
  description: "Tambah role exclusive dengan slot & durasi (hanya boleh 1 active)",
  async exec(client, message, args) {
    if (!message.member.permissions.has("Administrator"))
      return message.reply("❌ Kamu tidak punya izin!");

    const name = args[0]?.toLowerCase();
    const role = message.mentions.roles.first();
    const price = parseInt(args[2]);
    const slots = parseInt(args[3]);
    const duration = parseInt(args[4]); // dalam hari
    const gradientArg = args[5]?.toLowerCase() === "on";
    const rarity = args[6]?.charAt(0).toUpperCase() + args[6]?.slice(1).toLowerCase();

    if (!name || !role || isNaN(price) || isNaN(slots) || isNaN(duration)) {
      return message.reply(
        "⚠️ Gunakan: `..addexclusive <nama> <@role> <harga> <slot> <durasiHari> <gradient(on/off)> <rarity>`"
      );
    }

    // Cek kalau sudah ada role exclusive
    const existExclusive = await ShopRole.findOne({
      guildId: message.guild.id,
      exclusive: true,
      expiresAt: { $gt: new Date() },
    });

    if (existExclusive) {
      return message.reply("⚠️ Hanya boleh ada 1 role exclusive aktif di shop!");
    }

    // Waktu expired
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    await ShopRole.create({
      guildId: message.guild.id,
      name,
      roleId: role.id,
      price,
      exclusive: true,
      slots,
      expiresAt,
      gradient: gradientArg,
      rarity: rarity || "Common",
    });

    message.reply(
      `🌟 Role **${role.name}** berhasil ditambahkan sebagai **Exclusive**!\n` +
      `> ✴️ **${name}**〔Gradient: ${gradientArg ? "ON" : "OFF"} || Rarity: ${rarity || "Common"}〕\n` +
      `> 💰 Harga: **${price}** | Slot: **0/${slots}** | ⏳ Berlaku sampai: **${expiresAt.toLocaleString()}**`
    );
  },
};
