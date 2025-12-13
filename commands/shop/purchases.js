const ExclusiveItem = require("../../schemas/ExclusiveItem");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "purchases",
  description: "Lihat daftar pembeli item exclusive",
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const items = await ExclusiveItem.find({ guildId: message.guild.id });
    if (!items.length) return message.reply("⚠️ Belum ada item exclusive di shop.");

    const embed = new EmbedBuilder()
      .setTitle("🧾 Daftar Pembeli Item Exclusive")
      .setColor(0x00bfff)
      .setDescription(
        items
          .map((item) => {
            const buyersList = item.buyers.length
              ? item.buyers.map((id) => `<@${id}>`).join(", ")
              : "_Belum ada pembeli_";
            return `**${item.name}**\n💰 ${item.price} | 🎟️ ${item.buyers.length}/${item.slots}\n👥 ${buyersList}`;
          })
          .join("\n\n")
      );

    message.channel.send({ embeds: [embed] });
  },
};
