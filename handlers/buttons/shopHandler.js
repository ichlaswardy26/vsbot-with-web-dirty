const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const ExclusiveItem = require("../../schemas/ExclusiveItem");
const ShopRole = require("../../schemas/ShopRole");
const config = require("../../config");

async function shopHandler(client, interaction) {
  // === [1] LIHAT ITEM EXCLUSIVE ===
  if (interaction.customId === "view_exclusive_items") {
    if (interaction.deferred || interaction.replied) return;
    await interaction.deferUpdate();

    try {
      const items = await ExclusiveItem.find({
        guildId: interaction.guild.id,
        expiresAt: { $gt: new Date() },
      });

      const banner = new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(
          interaction.guild.iconURL({ dynamic: true }) ||
          config.images.defaultGif
        )
      );

      let desc = "";
      if (!items.length) {
        desc = "⚠️ Tidak ada item exclusive yang tersedia saat ini.";
      } else {
        desc = items
          .map((item, i) => {
            const unix = Math.floor(item.expiresAt.getTime() / 1000);
            return `**${i + 1}. ${item.name}** (${item.buyers.length}/${item.slots}) - ${config.emojis.souls} ${item.price} [⏳ <t:${unix}:R>]`;
          })
          .join("\n");
      }

      const exclusiveText = new TextDisplayBuilder().setContent(desc);

      const backButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("back_to_main_shop")
          .setLabel("Back")
          .setStyle(ButtonStyle.Secondary)
      );

      const footer = new TextDisplayBuilder().setContent(
        `⏳ Item exclusive hanya tersedia untuk waktu terbatas.\n💡 Gunakan tombol di atas untuk kembali.`
      );

      const titleText = new TextDisplayBuilder().setContent("## 𝕎𝔼𝕃𝕃 𝕆𝔽 𝕊𝕆𝕌𝕃𝕊");

      const container = new ContainerBuilder()
        .addMediaGalleryComponents(banner)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(titleText)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(exclusiveText)
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(backButtonRow)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(footer);

      await interaction.message.edit({
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      console.error("Error rendering exclusive items container:", err);
      await interaction.message.edit({
        content: "❌ Terjadi kesalahan saat memuat item exclusive.",
        components: [],
      });
    }
    return;
  }

  // === [2] KEMBALI KE CONTAINER ROLE SHOP ===
  if (interaction.customId === "back_to_main_shop") {
    if (interaction.deferred || interaction.replied) return;
    await interaction.deferUpdate();

    try {
      let roles = await ShopRole.find({ guildId: interaction.guild.id });
      roles = roles.filter((r) => !r.expiresAt || r.expiresAt > new Date());

      const exclusiveRoles = roles.filter((r) => r.exclusive);
      const normalRoles = roles.filter((r) => !r.exclusive);

      const banner = new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(
          interaction.guild.iconURL({ dynamic: true }) ||
          config.images.defaultGif
        )
      );

      let exclusiveSection = null;
      if (exclusiveRoles.length) {
        const exclusiveText = "**🌟 Exclusive Role (Limited Time):**\n" +
          exclusiveRoles
            .map((r) => {
              const unix = r.expiresAt ? Math.floor(r.expiresAt.getTime() / 1000) : null;
              const exp = r.expiresAt ? `⏳ Expired <t:${unix}:R>` : "";
              return `✴️ **${r.name}**〔Gradient: ${r.gradient ? "ON" : "OFF"} || Rarity: ${r.rarity || "Common"}〕\n${config.emojis.souls} **${r.price}** (**${r.buyers.length}/${r.slots}**) ${exp}`;
            })
            .join("\n");
        exclusiveSection = new TextDisplayBuilder().setContent(exclusiveText);
      }

      let normalSection = null;
      if (normalRoles.length) {
        const normalText = "\n" +
          normalRoles
            .map((r) => {
              const description = r.description || "_Tidak ada deskripsi._";
              return `${config.emojis.souls} **${r.price}** - **${r.name}**\n${description}`;
            })
            .join("\n\n");
        normalSection = new TextDisplayBuilder().setContent(normalText);
      }

      const itemButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("view_exclusive_items")
          .setLabel("Exclusive")
          .setStyle(ButtonStyle.Secondary)
      );

      const footer = new TextDisplayBuilder().setContent(
        `### ⚠️ Peringatan Sistem
Jika bot mengalami error atau gangguan teknis, proses redeem tidak sah.
> 📝 Mohon segera lapor ke admin jika mengalami masalah tersebut.
> ✅ Redeem hanya berlaku saat sistem berjalan normal.`
      );

      const container = new ContainerBuilder()
        .addMediaGalleryComponents(banner)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## 𝕎𝔼𝕃𝕃 𝕆𝔽 𝕊𝕆𝕌𝕃𝕊"))
        .addSeparatorComponents(new SeparatorBuilder());
      
      if (exclusiveSection) container.addTextDisplayComponents(exclusiveSection);
      if (exclusiveSection && normalSection) container.addSeparatorComponents(new SeparatorBuilder());
      if (normalSection) container.addTextDisplayComponents(normalSection);
      
      container
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(itemButtonRow)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(footer);

      await interaction.message.edit({
        components: [container.toJSON()],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      console.error("Error rendering role shop container:", err);
      await interaction.message.edit({
        content: "❌ Terjadi kesalahan saat memuat role shop.",
        components: [],
      });
    }
    return;
  }
}

module.exports = shopHandler;
