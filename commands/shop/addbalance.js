const { EmbedBuilder } = require("discord.js");
const UserBalance = require("../../schemas/UserBalance");
const config = require("../../config.js");

module.exports = {
  name: "add",
  aliases: ["addbalance"],
  description: "Tambah saldo ke user",
  category: "shop",
  usage: "add <@user> <jumlah>",
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!user || isNaN(amount)) {
      const helpEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Cara Penggunaan`)
        .setDescription('Tambahkan saldo ke user.')
        .addFields(
          { name: '📝 Format', value: `\`${config.prefix}add <@user> <jumlah>\``, inline: false },
          { name: '📌 Contoh', value: `\`${config.prefix}add @User 1000\``, inline: false }
        )
        .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [helpEmbed] });
    }

    let userData =
      (await UserBalance.findOne({ guildId: message.guild.id, userId: user.id })) ||
      new UserBalance({ guildId: message.guild.id, userId: user.id, cash: 0 });

    const oldBalance = userData.cash;
    userData.cash += amount;
    await userData.save();

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors?.success || '#57F287')
      .setTitle(`${config.emojis?.check || '✅'} Saldo Berhasil Ditambahkan`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 User', value: `${user}`, inline: true },
        { name: `${config.emojis?.souls || '💰'} Ditambahkan`, value: `+${amount.toLocaleString()}`, inline: true },
        { name: '📊 Saldo Sekarang', value: `${userData.cash.toLocaleString()}`, inline: true }
      )
      .setFooter({ text: `Ditambahkan oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    message.reply({ embeds: [successEmbed] });
  },
};
