const {
  ContainerBuilder,
  StringSelectMenuBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "book",
  description: "Menampilkan menu dropdown informasi server",
  async exec(client, message) {
     
    const media = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(config.images.books)
    );

    const container = new ContainerBuilder()
      .setAccentColor(0xffffff)
      .addTextDisplayComponents((text) =>
        text.setContent("## ────୨ **𝐀𝐛𝐨𝐮𝐭 𝐒𝐞𝐫𝐯𝐞𝐫** ৎ────")
      )
      .addMediaGalleryComponents(media)
      .addSeparatorComponents((sep) => sep)
      .addTextDisplayComponents((text) =>
        text.setContent(
          "Terimakasih sudah join ke server **Villain Seraphyx**\n" +
            "Server Villain Seraphyx adalah server community dengan berbagai macam fitur " +
            "seperti __Event__, __Mabar__, __Chatting__, __Voice__ & __dll.__"
        )
      )
      .addSeparatorComponents((sep) => sep)
      .addActionRowComponents((row) =>
        row.setComponents(
          new StringSelectMenuBuilder()
            .setCustomId("info_select_menu")
            .setPlaceholder("Pilih kategori informasi")
            .addOptions([
              {
                label: "Role Information",
                description: "Lihat informasi tentang role di server.",
                value: "roles",
                emoji: config.emojis.roles,
              },
              {
                label: "Staff Information",
                description: "Daftar staff yang aktif saat ini.",
                value: "list",
                emoji: config.emojis.info,
              },
              {
                label: "Sosial Media",
                description: "Link sosial media dan kontak.",
                value: "social",
                emoji: config.emojis.website,
              },
            ])
        )
      );

    await message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
