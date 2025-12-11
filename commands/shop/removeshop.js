const ShopRole = require("../../schemas/ShopRole");

module.exports = {
  name: "removeshop",
  description: "Hapus role dari shop",
  async exec(client, message, args) {
    if (!message.member.permissions.has("Administrator"))
      return message.reply("❌ Kamu tidak punya izin!");

    const name = args[0]?.toLowerCase();
    if (!name) return message.reply("⚠️ Gunakan: `..removeshop <nama>`");

    const shopRole = await ShopRole.findOneAndDelete({ guildId: message.guild.id, name });
    if (!shopRole) return message.reply("⚠️ Role tidak ada di shop!");

    message.reply(`✅ Role \`${name}\` berhasil dihapus dari shop!`);
  },
};
