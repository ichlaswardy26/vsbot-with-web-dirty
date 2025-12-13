const { 
  MessageFlags,
  ContainerBuilder, 
  SeparatorBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require("discord.js");
const config = require("../config.js");

module.exports = {
  name: "rinfo",
  async exec(client, message) {

    const sep = new SeparatorBuilder();

    const media = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(config.images.rinfo)
    );

      const text1 = new TextDisplayBuilder()
      .setContent(`## ROLES INFO 

**${config.emojis.foryouCommunity} Staff** 
* ${config.roles.owner ? `<@&${config.roles.owner}>` : '@Owner'} : Pendiri utama yang **mendirikan server/komunitas** dan menetapkan visi.
* ${config.roles.coOwner ? `<@&${config.roles.coOwner}>` : '@Co-Owner'} : Pendiri pendamping yang **membantu Founder** menjalankan komunitas sejak awal.
* ${config.roles.engineer ? `<@&${config.roles.engineer}>` : '@Engineer'} : Pengurus utama yang **mengelola sistem, teknis, dan operasional** server.
* ${config.roles.moderator ? `<@&${config.roles.moderator}>` : '@Moderator'} :  Penjaga yang **mengawasi anggota, chat, dan menegakkan aturan**.
* ${config.roles.admin ? `<@&${config.roles.admin}>` : '@Admin'} : Tim inti yang **menjalankan tugas operasional** harian server secara keseluruhan.
* ${config.roles.helper ? `<@&${config.roles.helper}>` : '@Helper'} : Anggota yang **memberikan bantuan dan menjawab pertanyaan** anggota lain.
* ${config.roles.eventOrganizer ? `<@&${config.roles.eventOrganizer}>` : '@Event Organizer'} : Tim yang **merencanakan dan melaksanakan acara** atau event di server.
* ${config.roles.partnerManager ? `<@&${config.roles.partnerManager}>` : '@Partner Manager'} : Pihak yang **membangun citra positif** dan mengurus komunikasi eksternal.
* ${config.roles.helper ? `<@&${config.roles.helper}>` : '@Helper'} : Relawan yang **membantu tugas ringan** dan menyambut anggota baru.
* ${config.roles.designer ? `<@&${config.roles.designer}>` : '@Designer'} : Anggota yang **membuat semua aset visual/grafis** (logo, *banner*, dll.) server.
* ${config.roles.contentCreator ? `<@&${config.roles.contentCreator}>` : '@Content Creator'} : Tim yang **membuat dan mengelola konten** promosi (video, unggahan) server.`)

    const text2 = new TextDisplayBuilder()
    .setContent(`**${config.emojis.foryouCommunity} Support**
* ${config.roles.supportTier1 ? `<@&${config.roles.supportTier1}>` : '@Support Tier 1'}  : Orang yang mendonate server dengan minimal 2m cowoncy/10.000/bulan
* ${config.roles.supportTier2 ? `<@&${config.roles.supportTier2}>` : '@Support Tier 2'} : Orang yang mendonate server dengan minimal 3m cowoncy/20.000/bulan
* ${config.roles.supportTier3 ? `<@&${config.roles.supportTier3}>` : '@Support Tier 3'} : Orang yang mendonate server dengan minimal 6m cowoncy/30.000/bulan
* ${config.roles.supportTier4 ? `<@&${config.roles.supportTier4}>` : '@Support Tier 4'}  : Orang yang mendonate server dengan minimal 8m cowoncy/40.000/bulan
* ${config.roles.boost ? `<@&${config.roles.boost}>` : '@Boost'} : Orang yang mem boost server
Selengkapnya bisa cek ${config.channels.premiumBenefit ? `<#${config.channels.premiumBenefit}>` : 'premium benefit channel'}`)

    const text3 = new TextDisplayBuilder()
    .setContent(`**${config.emojis.foryouCommunity} Level**
* ${config.roles.level[1] ? `<@&${config.roles.level[1]}>` : '@Level 1'} : Chat/voice dan mendapatkan exp,jadilah level 1
* ${config.roles.level[2] ? `<@&${config.roles.level[2]}>` : '@Level 2'} :  Chat/voice dan mendapatkan exp,jadilah level 2
* ${config.roles.level[7] ? `<@&${config.roles.level[7]}>` : '@Level 7'} :  Chat/voice dan mendapatkan exp,jadilah level 7
* ${config.roles.level[20] ? `<@&${config.roles.level[20]}>` : '@Level 20'} :  Chat/voice dan mendapatkan exp,jadilah level 20
* ${config.roles.level[30] ? `<@&${config.roles.level[30]}>` : '@Level 30'} :  Chat/voice dan mendapatkan exp,jadilah level 30
* ${config.roles.level[40] ? `<@&${config.roles.level[40]}>` : '@Level 40'} :  Chat/voice dan mendapatkan exp,jadilah level 40
* ${config.roles.level[50] ? `<@&${config.roles.level[50]}>` : '@Level 50'} :  Chat/voice dan mendapatkan exp,jadilah level 50
* ${config.roles.level[60] ? `<@&${config.roles.level[60]}>` : '@Level 60'} : Chat/voice dan mendapatkan exp,jadilah level 60
* ${config.roles.level[70] ? `<@&${config.roles.level[70]}>` : '@Level 70'} :  Chat/voice dan mendapatkan exp,jadilah level 70
* ${config.roles.level[80] ? `<@&${config.roles.level[80]}>` : '@Level 80'} :  Chat/voice dan mendapatkan exp,jadilah level 80
* ${config.roles.level[90] ? `<@&${config.roles.level[90]}>` : '@Level 90'} :  Chat/voice dan mendapatkan exp,jadilah level 90
* ${config.roles.level[100] ? `<@&${config.roles.level[100]}>` : '@Level 100'} : Chat/voice dan mendapatkan exp,jadilah level 100`)

    const text4 = new TextDisplayBuilder()
    .setContent(`**${config.emojis.foryouCommunity} Special**
* ${config.roles.editor ? `<@&${config.roles.editor}>` : '@Editor'}  : Orang yang biasa mengedit,dan mengajari ngedit
* ${config.roles.special ? `<@&${config.roles.special}>` : '@Special'} : Orang special ${config.roles.owner ? `<@&${config.roles.owner}>` : '@Owner'} 
* ${config.roles.streamer ? `<@&${config.roles.streamer}>` : '@Streamer'}  : Orang yang biasa suka stream dan sudah terkonfirmasi
* ${config.roles.videoCreator ? `<@&${config.roles.videoCreator}>` : '@Video Creator'}  : Orang yang suka upp vidio
* ${config.roles.bigGiveawayWinner ? `<@&${config.roles.bigGiveawayWinner}>` : '@Big Giveaway Winner'} : Pemenang giveaway besar,seperti event,dan giveaway lainnya
* ${config.roles.smallGiveawayWinner ? `<@&${config.roles.smallGiveawayWinner}>` : '@Small Giveaway Winner'}  : pemenang giveaway kecil kecilan
* ${config.roles.bioLink ? `<@&${config.roles.bioLink}>` : '@Bio Link'} : Orang yang menaruh link server di bionya,dan sudah konfirmasi
* ${config.roles.socialFollower ? `<@&${config.roles.socialFollower}>` : '@Social Follower'} : Yang sudah follow ig/akun tiktok foryou community
* ${config.roles.activeMember ? `<@&${config.roles.activeMember}>` : '@Active Member'}  : Orang ter active,mau di voice,maupun di chat`)


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
