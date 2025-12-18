const { EmbedBuilder } = require("discord.js");
const ShopRole = require("../../schemas/ShopRole");
const rolePermissions = require("../../util/rolePermissions");
const config = require("../../config.js");

module.exports = {
  name: "addshop",
  description: "Tambah role ke shop",
  category: "shop",
  usage: "addshop <nama> <@role> <harga> --desk <deskripsi>",
  async exec(client, message, args) {
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    if (args.length < 3) {
      const helpEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Cara Penggunaan`)
        .setDescription('Tambahkan role baru ke shop.')
        .addFields(
          { name: '📝 Format', value: `\`${config.prefix}addshop <nama> <@role> <harga> --desk <deskripsi>\``, inline: false },
          { name: '📌 Contoh', value: `\`${config.prefix}addshop vip @VIP 5000 --desk Role VIP dengan akses eksklusif\``, inline: false }
        )
        .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [helpEmbed] });
    }

    const name = args[0]?.toLowerCase();
    const role = message.mentions.roles.first();
    const price = parseInt(args[2]);

    if (!name || !role || isNaN(price)) {
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Format Salah`)
        .setDescription('Pastikan format perintah sudah benar.')
        .addFields({ name: '📝 Format', value: `\`${config.prefix}addshop <nama> <@role> <harga> --desk <deskripsi>\`` })
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }

    const deskIndex = args.indexOf("--desk");
    let description = "";
    if (deskIndex !== -1) {
      description = args.slice(deskIndex + 1).join(" ");
    }

    const exist = await ShopRole.findOne({ guildId: message.guild.id, name });
    if (exist) {
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Nama Sudah Digunakan`)
        .setDescription(`Nama \`${name}\` sudah dipakai di shop!`)
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }

    await ShopRole.create({
      guildId: message.guild.id,
      name,
      roleId: role.id,
      price,
      description,
    });

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors?.success || '#57F287')
      .setTitle(`${config.emojis?.check || '✅'} Role Ditambahkan ke Shop`)
      .setDescription(`Role **${role.name}** berhasil ditambahkan!`)
      .addFields(
        { name: '📛 Nama', value: `\`${name}\``, inline: true },
        { name: `${config.emojis?.souls || '💰'} Harga`, value: `${price.toLocaleString()}`, inline: true },
        { name: '🎭 Role', value: `${role}`, inline: true },
        { name: '📝 Deskripsi', value: description || '_Tidak ada deskripsi_', inline: false }
      )
      .setFooter({ text: `Ditambahkan oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    message.reply({ embeds: [successEmbed] });
  },
};
