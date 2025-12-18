const { EmbedBuilder } = require("discord.js");
const ExclusiveItem = require("../../schemas/ExclusiveItem");
const config = require("../../config.js");

module.exports = {
  name: "done",
  description: "Konfirmasi pembelian item exclusive oleh admin",
  category: "shop",
  usage: "done @user <nama item>",
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const user = message.mentions.users.first();
    const itemName = args.slice(1).join(" ");

    if (!user || !itemName) {
      const helpEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Cara Penggunaan`)
        .setDescription('Konfirmasi pembelian item exclusive.')
        .addFields(
          { name: '📝 Format', value: `\`${config.prefix}done @user <nama item>\``, inline: false },
          { name: '📌 Contoh', value: `\`${config.prefix}done @User Owo Cash\``, inline: false }
        )
        .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [helpEmbed] });
    }

    const item = await ExclusiveItem.findOne({
      guildId: message.guild.id,
      name: itemName,
    });

    if (!item) {
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Item Tidak Ditemukan`)
        .setDescription(`Item **${itemName}** tidak ditemukan di shop.`)
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }

    if (!item.buyers.includes(user.id)) {
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Belum Membeli`)
        .setDescription(`${user} belum membeli item **${item.name}**.`)
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }

    if (!item.confirmedBuyers) item.confirmedBuyers = [];
    if (item.confirmedBuyers.includes(user.id)) {
      const infoEmbed = new EmbedBuilder()
        .setColor(config.colors?.info || '#5865F2')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Sudah Dikonfirmasi`)
        .setDescription(`Pembelian oleh ${user} untuk **${item.name}** sudah dikonfirmasi sebelumnya.`)
        .setTimestamp();
      return message.reply({ embeds: [infoEmbed] });
    }

    item.confirmedBuyers.push(user.id);
    await item.save();

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors?.success || '#57F287')
      .setTitle(`${config.emojis?.check || '✅'} Pembelian Dikonfirmasi`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Pembeli', value: `${user}`, inline: true },
        { name: '📦 Item', value: item.name, inline: true },
        { name: '📊 Status', value: 'Dikonfirmasi', inline: true }
      )
      .setFooter({ text: `Dikonfirmasi oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    return message.channel.send({ embeds: [successEmbed] });
  },
};
