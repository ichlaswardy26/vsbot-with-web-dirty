const ShopRole = require("../../schemas/ShopRole");
const ExclusiveItem = require("../../schemas/ExclusiveItem");
const UserBalance = require("../../schemas/UserBalance");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "buy",
  aliases: ["beli"],
  description: "Beli role atau item exclusive dari shop",
  usage: "buy <nama_item>",
  async exec(client, message, args) {
    const name = args[0]?.toLowerCase();
    const soulsEmoji = config.emojis?.souls || "💰";
    
    if (!name) {
      const helpEmbed = new EmbedBuilder()
        .setTitle("🛒 Cara Membeli")
        .setDescription("Gunakan command ini untuk membeli item dari shop.")
        .setColor(config.colors?.info || "#5865F2")
        .addFields(
          { name: "📝 Format", value: "`buy <nama_item>`", inline: false },
          { name: "💡 Contoh", value: "`buy vip`\n`buy nitro`", inline: false }
        )
        .setFooter({ text: "Gunakan 'shop' untuk melihat daftar item" });
        
      return message.reply({ embeds: [helpEmbed] });
    }

    const guildId = message.guild.id;

    // Cari di ShopRole atau ExclusiveItem
    let shopRole = await ShopRole.findOne({ guildId, name });
    let exclusiveItem = !shopRole ? await ExclusiveItem.findOne({ guildId, name }) : null;

    // Jika tidak ditemukan keduanya
    if (!shopRole && !exclusiveItem) {
      return message.reply(`${config.emojis?.cross || "❌"} **|** Item atau role dengan nama **${name}** tidak ditemukan di shop.`);
    }

    // Ambil data user
    const userData =
      (await UserBalance.findOne({ guildId, userId: message.author.id })) ||
      new UserBalance({ guildId, userId: message.author.id, cash: 0 });

    // Jika pembelian role biasa / exclusive role
    if (shopRole) {
      // Validasi expired
      if (shopRole.expiresAt && Date.now() > shopRole.expiresAt) {
        await ShopRole.deleteOne({ _id: shopRole._id });
        return message.reply(`${config.emojis?.cross || "❌"} **|** Role ini sudah tidak tersedia di shop (expired).`);
      }

      // Validasi slot exclusive
      if (shopRole.exclusive && shopRole.slots > 0) {
        if (shopRole.buyers.includes(message.author.id)) {
          return message.reply(`${config.emojis?.warning || "⚠️"} **|** Kamu sudah membeli role ini sebelumnya!`);
        }
        if (shopRole.buyers.length >= shopRole.slots) {
          return message.reply(`${config.emojis?.cross || "❌"} **|** Slot role ini sudah penuh!`);
        }
      }

      const role = message.guild.roles.cache.get(shopRole.roleId);
      if (!role) {
        return message.reply(`${config.emojis?.warning || "⚠️"} **|** Role sudah dihapus dari server!`);
      }

      if (userData.cash < shopRole.price) {
        return message.reply(`${config.emojis?.cross || "❌"} **|** Saldo tidak cukup! Kamu punya ${soulsEmoji} **${userData.cash.toLocaleString()}** souls, butuh **${shopRole.price.toLocaleString()}** souls.`);
      }

      // Kurangi saldo
      userData.cash -= shopRole.price;
      await userData.save();

      // Update buyers jika exclusive
      if (shopRole.exclusive && shopRole.slots > 0) {
        shopRole.buyers.push(message.author.id);
        await shopRole.save();
      }

      // Berikan role
      await message.member.roles.add(role);

      const embed = new EmbedBuilder()
        .setTitle("✅ Pembelian Berhasil!")
        .setDescription(`Kamu berhasil membeli role **${role.name}**!`)
        .setColor(config.colors?.success || "#57F287")
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: `${soulsEmoji} Harga`, value: `**${shopRole.price.toLocaleString()}** souls`, inline: true },
          { name: "💰 Sisa Saldo", value: `**${userData.cash.toLocaleString()}** souls`, inline: true }
        )
        .setFooter({ text: `Pembeli: ${message.author.tag}` })
        .setTimestamp();

      if (shopRole.exclusive) {
        embed.addFields({ 
          name: "📊 Slot Terpakai", 
          value: `**${shopRole.buyers.length}/${shopRole.slots}**`, 
          inline: true 
        });
      }

      return message.channel.send({ embeds: [embed] });
    }

    // Jika pembelian item exclusive
    if (exclusiveItem) {
      if (exclusiveItem.buyers.includes(message.author.id)) {
        return message.reply(`${config.emojis?.warning || "⚠️"} **|** Kamu sudah membeli item ini!`);
      }
      if (exclusiveItem.buyers.length >= exclusiveItem.slots) {
        return message.reply(`${config.emojis?.cross || "❌"} **|** Slot item ini sudah penuh!`);
      }

      if (userData.cash < exclusiveItem.price) {
        return message.reply(`${config.emojis?.cross || "❌"} **|** Saldo tidak cukup! Kamu punya ${soulsEmoji} **${userData.cash.toLocaleString()}** souls, butuh **${exclusiveItem.price.toLocaleString()}** souls.`);
      }

      // Kurangi saldo
      userData.cash -= exclusiveItem.price;
      await userData.save();

      // Tambahkan pembeli
      exclusiveItem.buyers.push(message.author.id);
      await exclusiveItem.save();

      const embed = new EmbedBuilder()
        .setTitle("🌟 Pembelian Item Exclusive!")
        .setDescription(`Kamu berhasil membeli **${exclusiveItem.name}**!`)
        .setColor(config.colors?.warning || "#FEE75C")
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: `${soulsEmoji} Harga`, value: `**${exclusiveItem.price.toLocaleString()}** souls`, inline: true },
          { name: "💰 Sisa Saldo", value: `**${userData.cash.toLocaleString()}** souls`, inline: true },
          { name: "📊 Slot Terpakai", value: `**${exclusiveItem.buyers.length}/${exclusiveItem.slots}**`, inline: true }
        )
        .addFields({
          name: "📝 Catatan",
          value: "Harap tunggu konfirmasi admin untuk klaim itemmu.",
          inline: false
        })
        .setFooter({ text: `Pembeli: ${message.author.tag}` })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }
  },
};
