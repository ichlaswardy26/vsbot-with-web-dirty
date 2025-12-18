const { 
  MessageFlags,
  ContainerBuilder, 
  SeparatorBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "rinfo",
  description: "Display server roles information",
  category: "utility",
  async exec(client, message) {

    const sep = new SeparatorBuilder();

    // Only add media gallery if rinfo image is configured
    const rinfoImage = config.images?.rinfo;
    const media = rinfoImage ? new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(rinfoImage)
    ) : null;

    // Helper function to safely get role mention
    const getRole = (roleKey, fallback) => {
      const roleId = config.roles?.[roleKey];
      return roleId ? `<@&${roleId}>` : fallback;
    };

    const communityEmoji = config.emojis?.foryouCommunity || '📋';

    const text1 = new TextDisplayBuilder()
      .setContent(`## ROLES INFO 

**${communityEmoji} Staff** 
* ${getRole('owner', '@Owner')} : Pendiri utama yang **mendirikan server/komunitas** dan menetapkan visi.
* ${getRole('coOwner', '@Co-Owner')} : Pendiri pendamping yang **membantu Founder** menjalankan komunitas sejak awal.
* ${getRole('engineer', '@Engineer')} : Pengurus utama yang **mengelola sistem, teknis, dan operasional** server.
* ${getRole('moderator', '@Moderator')} :  Penjaga yang **mengawasi anggota, chat, dan menegakkan aturan**.
* ${getRole('admin', '@Admin')} : Tim inti yang **menjalankan tugas operasional** harian server secara keseluruhan.
* ${getRole('helper', '@Helper')} : Anggota yang **memberikan bantuan dan menjawab pertanyaan** anggota lain.
* ${getRole('eventOrganizer', '@Event Organizer')} : Tim yang **merencanakan dan melaksanakan acara** atau event di server.
* ${getRole('partnerManager', '@Partner Manager')} : Pihak yang **membangun citra positif** dan mengurus komunikasi eksternal.
* ${getRole('helper', '@Helper')} : Relawan yang **membantu tugas ringan** dan menyambut anggota baru.
* ${getRole('designer', '@Designer')} : Anggota yang **membuat semua aset visual/grafis** (logo, *banner*, dll.) server.
* ${getRole('contentCreator', '@Content Creator')} : Tim yang **membuat dan mengelola konten** promosi (video, unggahan) server.`)

    const getChannel = (channelKey, fallback) => {
      const channelId = config.channels?.[channelKey];
      return channelId ? `<#${channelId}>` : fallback;
    };

    const text2 = new TextDisplayBuilder()
      .setContent(`**${communityEmoji} Support**
* ${getRole('supportTier1', '@Support Tier 1')}  : Orang yang mendonate server dengan minimal 2m cowoncy/10.000/bulan
* ${getRole('supportTier2', '@Support Tier 2')} : Orang yang mendonate server dengan minimal 3m cowoncy/20.000/bulan
* ${getRole('supportTier3', '@Support Tier 3')} : Orang yang mendonate server dengan minimal 6m cowoncy/30.000/bulan
* ${getRole('supportTier4', '@Support Tier 4')}  : Orang yang mendonate server dengan minimal 8m cowoncy/40.000/bulan
* ${getRole('boost', '@Boost')} : Orang yang mem boost server
Selengkapnya bisa cek ${getChannel('premiumBenefit', 'premium benefit channel')}`)

    // Helper function to safely get level role
    const getLevelRole = (level) => {
      const levelRoles = config.roles?.level;
      if (!levelRoles) return `@Level ${level}`;
      const roleId = levelRoles[level];
      return roleId ? `<@&${roleId}>` : `@Level ${level}`;
    };

    const text3 = new TextDisplayBuilder()
      .setContent(`**${config.emojis?.foryouCommunity || '📋'} Level**
* ${getLevelRole(1)} : Chat/voice dan mendapatkan exp,jadilah level 1
* ${getLevelRole(2)} :  Chat/voice dan mendapatkan exp,jadilah level 2
* ${getLevelRole(7)} :  Chat/voice dan mendapatkan exp,jadilah level 7
* ${getLevelRole(20)} :  Chat/voice dan mendapatkan exp,jadilah level 20
* ${getLevelRole(30)} :  Chat/voice dan mendapatkan exp,jadilah level 30
* ${getLevelRole(40)} :  Chat/voice dan mendapatkan exp,jadilah level 40
* ${getLevelRole(50)} :  Chat/voice dan mendapatkan exp,jadilah level 50
* ${getLevelRole(60)} : Chat/voice dan mendapatkan exp,jadilah level 60
* ${getLevelRole(70)} :  Chat/voice dan mendapatkan exp,jadilah level 70
* ${getLevelRole(80)} :  Chat/voice dan mendapatkan exp,jadilah level 80
* ${getLevelRole(90)} :  Chat/voice dan mendapatkan exp,jadilah level 90
* ${getLevelRole(100)} : Chat/voice dan mendapatkan exp,jadilah level 100`)

    const text4 = new TextDisplayBuilder()
      .setContent(`**${communityEmoji} Special**
* ${getRole('editor', '@Editor')}  : Orang yang biasa mengedit,dan mengajari ngedit
* ${getRole('special', '@Special')} : Orang special ${getRole('owner', '@Owner')} 
* ${getRole('streamer', '@Streamer')}  : Orang yang biasa suka stream dan sudah terkonfirmasi
* ${getRole('videoCreator', '@Video Creator')}  : Orang yang suka upp vidio
* ${getRole('bigGiveawayWinner', '@Big Giveaway Winner')} : Pemenang giveaway besar,seperti event,dan giveaway lainnya
* ${getRole('smallGiveawayWinner', '@Small Giveaway Winner')}  : pemenang giveaway kecil kecilan
* ${getRole('bioLink', '@Bio Link')} : Orang yang menaruh link server di bionya,dan sudah konfirmasi
* ${getRole('socialFollower', '@Social Follower')} : Yang sudah follow ig/akun tiktok foryou community
* ${getRole('activeMember', '@Active Member')}  : Orang ter active,mau di voice,maupun di chat`)

    const container1 = new ContainerBuilder()
      .setAccentColor(0xffffff);
    
    // Only add media gallery if image is configured
    if (media) {
      container1.addMediaGalleryComponents(media);
    }
    
    container1
      .addSeparatorComponents(sep)
      .addTextDisplayComponents(text1)
      .addSeparatorComponents(sep);

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
