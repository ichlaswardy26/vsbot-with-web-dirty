const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  EmbedBuilder,
  ContainerBuilder, 
  SeparatorBuilder, 
  TextDisplayBuilder, 
  MediaGalleryBuilder, 
  MediaGalleryItemBuilder, 
  MessageFlags 
} = require("discord.js");
const ShopRole = require("../../schemas/ShopRole");
const config = require("../../config.js");

module.exports = {
  name: "shop",
  aliases: ["wos", "toko"],
  description: "Lihat daftar role yang dijual",
  async exec(client, message) {
    let roles = await ShopRole.find({ guildId: message.guild.id });

    // Hapus role exclusive yang sudah expired
    for (const role of roles) {
      if (role.expiresAt && role.expiresAt < new Date()) {
        await ShopRole.deleteOne({ _id: role._id });
      }
    }

    // Ambil ulang data setelah filter expired
    roles = await ShopRole.find({ guildId: message.guild.id });
    
    if (!roles.length) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle("🛒 Shop Kosong")
        .setDescription("Belum ada role yang dijual di shop saat ini.")
        .setColor(config.colors?.warning || "#FEE75C")
        .setFooter({ text: "Hubungi admin untuk menambahkan item" });
        
      return message.reply({ embeds: [emptyEmbed] });
    }

    const exclusiveRoles = roles.filter(r => r.exclusive);
    const normalRoles = roles.filter(r => !r.exclusive);

    const soulsEmoji = config.emojis?.souls || "💰";

    // Banner
    const banner = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(
        message.guild.iconURL({ dynamic: true }) || config.images?.defaultGif || "https://i.imgur.com/AfFp7pu.png"
      )
    );

    // Title
    const titleText = new TextDisplayBuilder().setContent("## 🛒 𝕎𝔼𝕃𝕃 𝕆𝔽 𝕊𝕆𝕌𝕃𝕊");

    // Exclusive roles section
    let exclusiveSection = null;
    if (exclusiveRoles.length) {
      const exclusiveText = "**🌟 Role Exclusive (Terbatas):**\n" +
        exclusiveRoles.map(r => {
          const unix = r.expiresAt ? Math.floor(r.expiresAt.getTime() / 1000) : null;
          const exp = unix ? `⏳ Berakhir <t:${unix}:R>` : "";
          return `✴️ **${r.name}**〔Gradient: ${r.gradient ? "ON" : "OFF"} || Rarity: ${r.rarity || "Common"}〕\n${soulsEmoji} **${r.price.toLocaleString()}** (**${r.buyers.length}/${r.slots}** slot) ${exp}`;
        }).join("\n\n");
      exclusiveSection = new TextDisplayBuilder().setContent(exclusiveText);
    }

    // Normal roles section
    let normalSection = null;
    if (normalRoles.length) {
      const normalText = "**📦 Role Reguler:**\n" +
        normalRoles.map(r => {
          const desc = r.description || "_Tidak ada deskripsi._";
          return `${soulsEmoji} **${r.price.toLocaleString()}** - **${r.name}**\n> ${desc}`;
        }).join("\n\n");
      normalSection = new TextDisplayBuilder().setContent(normalText);
    }

    // Footer
    const footer = new TextDisplayBuilder().setContent(
      `### ⚠️ Peringatan Sistem
Jika bot mengalami error atau gangguan teknis, proses redeem tidak sah.
> 📝 Mohon segera lapor ke admin jika mengalami masalah tersebut.
> ✅ Redeem hanya berlaku saat sistem berjalan normal.
> 💡 Gunakan \`buy <nama>\` untuk membeli item.`
    );

    // Button row
    const itemButtonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("view_exclusive_items")
        .setLabel("Lihat Item Exclusive")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⭐")
    );

    // Build container layout
    const container = new ContainerBuilder()
      .addMediaGalleryComponents(banner)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(titleText)
      .addSeparatorComponents(new SeparatorBuilder());

    if (exclusiveSection) container.addTextDisplayComponents(exclusiveSection);
    if (exclusiveSection && normalSection) container.addSeparatorComponents(new SeparatorBuilder());
    if (normalSection) container.addTextDisplayComponents(normalSection);

    container
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(itemButtonRow)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(footer)
      .addSeparatorComponents(new SeparatorBuilder());

    // Kirim pesan utama (shop display)
    await message.channel.send({
      components: [container.toJSON()],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
