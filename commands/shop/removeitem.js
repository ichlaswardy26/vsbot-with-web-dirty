const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ShopRole = require("../../schemas/ShopRole");

module.exports = {
  name: "removeitem",
  description: "Hapus item exclusive aktif dari shop (dengan konfirmasi tombol)",
  async exec(client, message) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Kamu tidak punya izin untuk menghapus item!");
    }

    // Cek apakah ada item exclusive aktif
    const item = await ShopRole.findOne({ guildId: message.guild.id, exclusive: true });
    if (!item) {
      return message.reply("⚠️ Tidak ada item exclusive aktif yang bisa dihapus.");
    }

    // Buat embed konfirmasi
    const confirmEmbed = new EmbedBuilder()
      .setTitle("⚠️ Konfirmasi Penghapusan Item Exclusive")
      .setColor(0xff4444)
      .addFields(
        { name: "Nama Item", value: item.name, inline: true },
        { name: "Harga", value: `${item.price}`, inline: true },
        { name: "Slot", value: `${item.slots}`, inline: true },
        { name: "Deskripsi", value: item.description || "_Tidak ada deskripsi._" }
      )
      .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_removeitem")
        .setLabel("🗑️ Hapus Item")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_removeitem")
        .setLabel("❌ Batal")
        .setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

    // Buat collector tombol untuk konfirmasi
    const filter = (i) => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 15000 });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "confirm_removeitem") {
        await ShopRole.deleteOne({ _id: item._id });

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00ff88)
              .setTitle("✅ Item Exclusive Dihapus")
              .setDescription(`Item **${item.name}** berhasil dihapus dari shop.`)
              .setTimestamp(),
          ],
          components: [],
        });

        collector.stop();
      }

      if (interaction.customId === "cancel_removeitem") {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffcc00)
              .setTitle("❌ Penghapusan Dibatalkan")
              .setDescription("Item tidak jadi dihapus.")
              .setTimestamp(),
          ],
          components: [],
        });

        collector.stop();
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        msg.edit({
          components: [],
          embeds: [
            confirmEmbed.setFooter({ text: "⏰ Waktu konfirmasi habis, item tidak dihapus." }).setColor(0x999999),
          ],
        });
      }
    });
  },
};
