const { 
  MessageFlags,
  ContainerBuilder, 
  SeparatorBuilder,
  MediaGalleryBuilder,
  SectionBuilder,
  ButtonStyle,
  ButtonBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder
} = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "rules",
  description: "Display server rules",
  category: "utility",
  async exec(client, message) {

    const sep = new SeparatorBuilder();

    const sectionWithButtons = [
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('📸 **── Instagram**'))
        .setButtonAccessory(
          new ButtonBuilder()
            .setLabel('Follow us!')
            .setURL('https://instagram.com/vseraphyx')
            .setStyle(ButtonStyle.Link)
        ),
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.emojis.report} **── Report Area**`))
        .setButtonAccessory(
          new ButtonBuilder()
            .setLabel('Report!')
            .setURL(`https://discord.com/channels/${config.guildId || 'YOUR_GUILD_ID'}/${config.channels?.support || 'SUPPORT_CHANNEL_ID'}`)
            .setStyle(ButtonStyle.Link)
        ),
    ];

    const media = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL("https://cdn.discordapp.com/attachments/1423692990974525571/1423911850894163988/Proyek_Baru_6_1098556.png")
    );

    const text = new TextDisplayBuilder()
      .setContent(`1. __**Hormati Semua Orang**__
Jangan gunakan kata-kata kasar, hinaan, atau perilaku yang bersifat ofensif, diskriminatif, atau merendahkan orang lain.
**Sanksi: (Warn/time out/kick/ban)**

2. __**Tidak Ada Spam atau Iklan**__
Jangan mengirimkan spam, tautan iklan, atau promosi tanpa izin dari admin/moderator.
**Sanksi: (Time out/kick)**

3. __**Gunakan Bahasa yang Sesuai**__
Gunakan bahasa yang sopan dan sesuai konteks di channel. Hindari diskusi yang dapat memancing konflik seperti politik dan SARA.
**Sanksi: (Warn/time out/kick/ban)**

4. __**Larangan Konten NSFW**__
Jangan mengirimkan konten NSFW (Not Safe For Work), seperti gambar, video, atau teks yang tidak pantas di channel manapun.
**Sanksi: (Time out/kick/ban)**

5. __**Ikuti Topik Channel**__
Pastikan obrolan Anda relevan dengan topik channel yang digunakan. Gunakan channel dengan benar sesuai deskripsinya.
**Sanksi: (Warn)**

6. __**Dilarang Flaming atau Provokasi**__
Jangan memancing keributan atau sengaja membuat orang lain marah, baik dalam teks maupun suara.
**Sanksi: (Warn/time out/kick/ban)**

7. __**No Drama**__
Hindari konflik pribadi di server. Diskusi yang memicu drama pribadi harus dibawa ke DM.
**Sanksi: (Warn/time out)**

8. __**Laporan dan Masalah**__
Jika ada masalah atau pelanggaran, laporkan melalui open ticket ${config.channels.support ? `<#${config.channels.support}>` : 'support channel'} Atau hubungi ${config.roles.moderator ? `<@&${config.roles.moderator}>` : '@Moderator'} yang ada.

9. __**Dilarang Berisik di Voice Channel**__
Jangan mengganggu kenyamanan orang lain di voice channel dengan suara berisik, efek suara yang mengganggu, atau interupsi yang tidak perlu.
**Sanksi: (Warn/time out/kick)**

10. __**Dilarang Berpura Pura Menjadi Orang Lain Atau Doxing**__
Dilarang berpura pura atau menyamar menjadi orang lain untuk melakukan penipuan, provokasi, doxing.
**Sanksi: (Time out/kick/ban)**

11. __**Spam Phising**__
Dilarang share atau spam phising berbentuk link ataupun photo.
**Sanksi: (Softban)**

12. __**Menggunakan Tag Role Berlebihan**__
Dilarang Menggunakan Tag Role Berlebihan seperti @everyone/@here atau role lain dalam bentuk spam.
**Sanksi: (Warn/time out/kick/ban)**

13. __**Patuhi Seluruh Peraturan Yang Ada**__
Jika melanggar peraturan baik villains atau admin maka akan di tindak tegas dengan peraturan yang ada.`);

    const note = new TextDisplayBuilder()
      .setContent(`***Note:***
***3x warning akan mengakibatkan time out/kick/ban. Softban akan membuat akun anda terbanned dari server untuk sementara.***`);

    const small = new TextDisplayBuilder()
      .setContent(`**Jika ada kendala bug atau error dari bot, bisa langsung menghubungi:**\n> ✮ <@${config.staffUsers?.executive || 'EXECUTIVE_ID'}> (Executive)\n> ✮ <@${config.staffUsers?.supremeVisioner || 'VISIONER_ID'}> (Supreme Visioner)`);

    const container = new ContainerBuilder()
      .setAccentColor(0xffffff)
      .addMediaGalleryComponents(media)
      .addSeparatorComponents(sep)
      .addTextDisplayComponents(text)
      .addSeparatorComponents(sep)
      .addTextDisplayComponents(note)
      .addSeparatorComponents(sep)
      .addSectionComponents(sectionWithButtons)
      .addSeparatorComponents(sep)
      .addTextDisplayComponents(small);

    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
