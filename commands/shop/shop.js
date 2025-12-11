const { 
  AttachmentBuilder,
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
} = require("discord.js");
const ShopRole = require("../../schemas/ShopRole");
const path = require("path");
const fs = require("fs");

module.exports = {
  name: "shop",
  aliases: ["wos"],
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
    if (!roles.length) return message.reply("⚠️ Belum ada role di shop!");

    const exclusiveRoles = roles.filter(r => r.exclusive);
    const normalRoles = roles.filter(r => !r.exclusive);

    // === Container-based Shop Display ===
    const { 
      ContainerBuilder, 
      SeparatorBuilder, 
      TextDisplayBuilder, 
      MediaGalleryBuilder, 
      MediaGalleryItemBuilder, 
      MessageFlags 
    } = require("discord.js");

    // Banner
    const banner = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(
        message.guild.iconURL({ dynamic: true }) ||
        "https://media.discordapp.net/attachments/1366614812762570842/1426492512150884352/a8a69f5297fe2d3e60ff91610266b677.gif"
      )
    );

    // Title
    const titleText = new TextDisplayBuilder().setContent("## 𝕎𝔼𝕃𝕃 𝕆𝔽 𝕊𝕆𝕌𝕃𝕊");

    // Exclusive roles section
    let exclusiveSection = null;
    if (exclusiveRoles.length) {
      const exclusiveText = "**🌟 Exclusive Role (Limited Time):**\n" +
        exclusiveRoles.map(r => {
          const role = message.guild.roles.cache.get(r.roleId);
          const unix = r.expiresAt ? Math.floor(r.expiresAt.getTime() / 1000) : null;
          const exp = unix ? `⏳ Expired <t:${unix}:R>` : "";
          return `✴️ **${r.name}**〔Gradient: ${r.gradient ? "ON" : "OFF"} || Rarity: ${r.rarity || "Common"}〕\n<:souls:1373202161823121560> **${r.price}** (**${r.buyers.length}/${r.slots}**) ${exp}`;
        }).join("\n");
      exclusiveSection = new TextDisplayBuilder().setContent(exclusiveText);
    }

    // Normal roles section
    let normalSection = null;
    if (normalRoles.length) {
      const normalText = "\n" +
        normalRoles.map(r => {
          const desc = r.description || "_Tidak ada deskripsi._";
          return `<:souls:1373202161823121560> **${r.price}** - **${r.name}**\n${desc}`;
        }).join("\n\n");
      normalSection = new TextDisplayBuilder().setContent(normalText);
    }

    // Footer
    const footer = new TextDisplayBuilder().setContent(
      `### ⚠️ Peringatan Sistem
Jika bot mengalami error atau gangguan teknis, proses redeem tidak sah.
> 📝 Mohon segera lapor ke admin jika mengalami masalah tersebut.
> ✅ Redeem hanya berlaku saat sistem berjalan normal.`
    );

    // Button row
    const itemButtonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("view_exclusive_items")
        .setLabel("Exclusive")
        .setStyle(ButtonStyle.Secondary)
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
