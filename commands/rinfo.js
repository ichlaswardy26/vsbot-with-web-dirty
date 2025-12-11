const { 
  MessageFlags,
  ContainerBuilder, 
  SeparatorBuilder,
  SectionBuilder,
  ButtonStyle,
  ButtonBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require("discord.js");

module.exports = {
  name: "rinfo",
  async exec(client, message) {

    const sep = new SeparatorBuilder();

    const media = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(
        "https://cdn.discordapp.com/attachments/1433014182206246973/1443668956631269489/ROLES_INFORMATION_4.png?ex=6929e8fd&is=6928977d&hm=7227bd8f7d732e6f04c0dd9469bd7153e9e620d8381400b25715b4cea3ac189e&"
      )
    );

      const text1 = new TextDisplayBuilder()
      .setContent(`## ROLES INFO 

**<a:ForyouCommunity:1437466409155301406> Staff** 
* <@&1403994525596385310> : Pendiri utama yang **mendirikan server/komunitas** dan menetapkan visi.
* <@&1380221290656567357> : Pendiri pendamping yang **membantu Founder** menjalankan komunitas sejak awal.
* <@&1410992996874195168> : Pengurus utama yang **mengelola sistem, teknis, dan operasional** server.
* <@&1418977743596687430> :  Penjaga yang **mengawasi anggota, chat, dan menegakkan aturan**.
* <@&1379438440868741183> : Tim inti yang **menjalankan tugas operasional** harian server secara keseluruhan.
* <@&1427913691478757458> : Anggota yang **memberikan bantuan dan menjawab pertanyaan** anggota lain.
* <@&1427904432057876561> : Tim yang **merencanakan dan melaksanakan acara** atau event di server.
* <@&1427904196987850883> : Pihak yang **membangun citra positif** dan mengurus komunikasi eksternal.
* <@&1415621934703448074> : Relawan yang **membantu tugas ringan** dan menyambut anggota baru.
* <@&1438133889657864213> : Anggota yang **membuat semua aset visual/grafis** (logo, *banner*, dll.) server.
* <@&1443261548532338853> : Tim yang **membuat dan mengelola konten** promosi (video, unggahan) server.`)

    const text2 = new TextDisplayBuilder()
    .setContent(`**<a:ForyouCommunity:1437466409155301406> Support**
* <@&1388069568315916388>  : Orang yang mendonate server dengan minimal 2m cowoncy/10.000/bulan
* <@&1388068550677233754> : Orang yang mendonate server dengan minimal 3m cowoncy/20.000/bulan
* <@&1388068146065178795> : Orang yang mendonate server dengan minimal 6m cowoncy/30.000/bulan
* <@&1388067753633779712>  : Orang yang mendonate server dengan minimal 8m cowoncy/40.000/bulan
* <@&1362738686483107881> : Orang yang mem boost server
Selengkapnya bisa cek <#1431923183946043412>`)

    const text3 = new TextDisplayBuilder()
    .setContent(`**<a:ForyouCommunity:1437466409155301406> Level**
* <@&1371335206249955328> ; Chat/voice dan mendapatkan exp,jadilah level 1
* <@&1371335574178496593> :  Chat/voice dan mendapatkan exp,jadilah level 2
* <@&1371335732379258960> :  Chat/voice dan mendapatkan exp,jadilah level 7
* <@&1371335853401702461> :  Chat/voice dan mendapatkan exp,jadilah level 20
* <@&1371335916957990932> :  Chat/voice dan mendapatkan exp,jadilah level 30
* <@&1371335883068018738> :  Chat/voice dan mendapatkan exp,jadilah level 40
* <@&1371335954421252207> :  Chat/voice dan mendapatkan exp,jadilah level 50
* <@&1382639879468613672> : Chat/voice dan mendapatkan exp,jadilah level 60
* <@&1382639990353432596> :  Chat/voice dan mendapatkan exp,jadilah level 70
* <@&1382640036322873436> :  Chat/voice dan mendapatkan exp,jadilah level 80
* <@&1382639959508389928> :  Chat/voice dan mendapatkan exp,jadilah level 90
* <@&1382640068174549032> : Chat/voice dan mendapatkan exp,jadilah level 100`)

    const text4 = new TextDisplayBuilder()
    .setContent(`**<a:ForyouCommunity:1437466409155301406> Special**
* <@&1421815497820868689>  : Orang yang biasa mengedit,dan mengajari ngedit
* <@&1414121430932652063> : Orang special <@&1403994525596385310> 
* <@&1432970905415323750>  : Orang yang biasa suka stream dan sudah terkonfirmasi
* <@&1432970703769964635>  : Orang yang suka upp vidio
* <@&1406655930212290660> : Pemenang giveaway besar,seperti event,dan giveaway lainnya
* <@&1434487701050101830>  : pemenang giveaway kecil kecilan
* <@&1417557738673930290> : Orang yang menaruh link https://discord.gg/VPhXPMrj7t di bionya,dan sudah konfirmasi di <#1441288365306544169> 
* <@&1423258411679879249> : Yang sudah follow ig/akun tiktok foryou community
* <@&1443273921221755024>  : Orang ter active,mau di voice,maupun di chat`)


    const container1 = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addMediaGalleryComponents(media)
    .addSeparatorComponents(sep)
    .addTextDisplayComponents(text1)
    .addSeparatorComponents(sep)

    const container2 = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(text2)
    .addSeparatorComponents(sep)

    const container3 = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(text3)
    .addSeparatorComponents(sep)

    const container4 = new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(text4)

    await message.channel.send({
      components: [container1, container2, container3, container4],
      flags: MessageFlags.IsComponentsV2
    });

    // Delete original message after sending response
    try {
      await message.delete();
    } catch (error) {
      console.error('Failed to delete original message:', error);
    }
  }
}
