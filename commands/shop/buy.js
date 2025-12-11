const ShopRole = require("../../schemas/ShopRole");
const ExclusiveItem = require("../../schemas/ExclusiveItem");
const UserBalance = require("../../schemas/UserBalance");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "buy",
  description: "Beli role atau item exclusive dari shop",
  async exec(client, message, args) {
    const name = args[0]?.toLowerCase();
    if (!name) return message.reply("⚠️ Gunakan: `..buy <namaRole/item>`");

    const guildId = message.guild.id;

    // cari di ShopRole atau ExclusiveItem
    let shopRole = await ShopRole.findOne({ guildId, name });
    let exclusiveItem = !shopRole ? await ExclusiveItem.findOne({ guildId, name }) : null;

    // jika tidak ditemukan keduanya
    if (!shopRole && !exclusiveItem)
      return message.reply("❌ Item atau role dengan nama tersebut tidak ditemukan di shop.");

    // ambil data user
    const userData =
      (await UserBalance.findOne({ guildId, userId: message.author.id })) ||
      new UserBalance({ guildId, userId: message.author.id, cash: 0 });

    // jika pembelian role biasa / exclusive role
    if (shopRole) {
      // validasi expired
      if (shopRole.expiresAt && Date.now() > shopRole.expiresAt) {
        await ShopRole.deleteOne({ _id: shopRole._id });
        return message.reply("❌ Role ini sudah tidak tersedia di shop (expired).");
      }

      // validasi slot exclusive
      if (shopRole.exclusive && shopRole.slots > 0) {
        if (shopRole.buyers.includes(message.author.id))
          return message.reply("⚠️ Kamu sudah membeli role ini sebelumnya!");
        if (shopRole.buyers.length >= shopRole.slots)
          return message.reply("🚫 Slot role ini sudah penuh!");
      }

      const role = message.guild.roles.cache.get(shopRole.roleId);
      if (!role) return message.reply("⚠️ Role sudah dihapus dari server!");

      if (userData.cash < shopRole.price)
        return message.reply(`❌ Saldo tidak cukup! Kamu punya 💰 ${userData.cash}`);

      // kurangi saldo
      userData.cash -= shopRole.price;
      await userData.save();

      // update buyers jika exclusive
      if (shopRole.exclusive && shopRole.slots > 0) {
        shopRole.buyers.push(message.author.id);
        await shopRole.save();
      }

      // berikan role
      await message.member.roles.add(role);

      const embed = new EmbedBuilder()
        .setColor(0x00ff83)
        .setTitle("✅ Pembelian Role Berhasil")
        .setDescription(
          `🎉 Kamu berhasil membeli role **${role.name}** seharga 💰 ${shopRole.price}` +
            (shopRole.exclusive
              ? `\n📌 Slot terpakai: ${shopRole.buyers.length}/${shopRole.slots}`
              : "")
        )
        .setFooter({ text: `Pembeli: ${message.author.tag}` });

      return message.channel.send({ embeds: [embed] });
    }

    // jika pembelian item exclusive
    if (exclusiveItem) {
      if (exclusiveItem.buyers.includes(message.author.id))
        return message.reply("⚠️ Kamu sudah membeli item ini!");
      if (exclusiveItem.buyers.length >= exclusiveItem.slots)
        return message.reply("🚫 Slot item ini sudah penuh!");

      if (userData.cash < exclusiveItem.price)
        return message.reply(`❌ Saldo tidak cukup! Kamu punya 💰 ${userData.cash}`);

      // kurangi saldo
      userData.cash -= exclusiveItem.price;
      await userData.save();

      // tambahkan pembeli
      exclusiveItem.buyers.push(message.author.id);
      await exclusiveItem.save();

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle("🌟 Pembelian Item Exclusive")
        .setDescription(
          `✅ Kamu berhasil membeli **${exclusiveItem.name}**!\n` +
            `💰 Harga: ${exclusiveItem.price}\n` +
            `🎟️ Slot terpakai: ${exclusiveItem.buyers.length}/${exclusiveItem.slots}\n\n` +
            `Harap tunggu konfirmasi admin untuk claim itemmu.`
        )
        .setFooter({ text: `Pembeli: ${message.author.tag}` });

      return message.channel.send({ embeds: [embed] });
    }
  },
};
