const {
  ContainerBuilder,
  StringSelectMenuBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "book",
  description: "Menampilkan menu dropdown informasi server",
  async exec(client, message) {
     
    const media = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(
        "https://media.discordapp.net/attachments/1423692990974525571/1423911893860618260/Proyek_Baru_6_C741254.png?ex=68e208ca&is=68e0b74a&hm=4e4ce82494f41b71843d63f930a5ee56c32742ae17e8af03df66a7e33b91d0d7&=&format=webp&quality=lossless&width=1318&height=439"
      )
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
                emoji: "<:roles:1368177567114330224>",
              },
              {
                label: "Staff Information",
                description: "Daftar staff yang aktif saat ini.",
                value: "list",
                emoji: "<:info:1368177794026045440>",
              },
              {
                label: "Sosial Media",
                description: "Link sosial media dan kontak.",
                value: "social",
                emoji: "<:website:1368177916063514719>",
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
