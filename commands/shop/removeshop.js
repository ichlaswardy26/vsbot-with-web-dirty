const { EmbedBuilder } = require("discord.js");
const ShopRole = require("../../schemas/ShopRole");
const config = require("../../config.js");

module.exports = {
  name: "removeshop",
  description: "Hapus role dari shop",
  category: "shop",
  usage: "removeshop <nama>",
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const name = args[0]?.toLowerCase();
    if (!name) {
      const helpEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Cara Penggunaan`)
        .setDescription('Hapus role dari shop.')
        .addFields(
          { name: '📝 Format', value: `\`${config.prefix}removeshop <nama>\``, inline: false },
          { name: '📌 Contoh', value: `\`${config.prefix}removeshop vip\``, inline: false }
        )
        .setFooter({ text: `Diminta oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [helpEmbed] });
    }

    const shopRole = await ShopRole.findOneAndDelete({ guildId: message.guild.id, name });
    if (!shopRole) {
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Tidak Ditemukan`)
        .setDescription(`Role dengan nama \`${name}\` tidak ada di shop!`)
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors?.success || '#57F287')
      .setTitle(`${config.emojis?.check || '✅'} Role Dihapus dari Shop`)
      .setDescription(`Role **${name}** berhasil dihapus dari shop.`)
      .setFooter({ text: `Dihapus oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    message.reply({ embeds: [successEmbed] });
  },
};
