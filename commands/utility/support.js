const {
  SeparatorBuilder,
  SectionBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  TextDisplayBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,   
} = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'sup',
  description: 'Display support/donation information',
  category: 'utility',
  async exec(client, message) {

    const sep = new SeparatorBuilder();

    const media = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL("https://media.discordapp.net/attachments/1423692990974525571/1423977785562763325/Proyek_Baru_6_252D9C7.png")
    );
    const qris = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL("https://cdn.discordapp.com/attachments/1423692990974525571/1423943797640925204/qr.png")
    );

    const button = [
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.emojis.tako} **── Tako**`))
        .setButtonAccessory(
          new ButtonBuilder()
            .setLabel(`Tako.id`)
            .setURL(`https://tako.id/richiee`)
            .setStyle(ButtonStyle.Link)
        ),
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.emojis.owoCash} **── Owo Cash**`))
        .setButtonAccessory(
          new ButtonBuilder()
            .setLabel(`Owo Cash`)
            .setURL(`https://discord.com/channels/${config.guildId || 'YOUR_GUILD_ID'}/${config.channels?.donation || 'DONATION_CHANNEL_ID'}`)
            .setStyle(ButtonStyle.Link)
        ),
    ];

    const text = new TextDisplayBuilder()
      .setContent(`𝑷𝒂𝒌𝒆𝒕 𝑺𝒖𝒑𝒑𝒐𝒓𝒕 ${config.emojis.blackBoost} 
↓
 ${config.emojis.cross} Cavern of Dread : IDR 15.000 /5M ${config.emojis.owoCash}
- Special Thanks & Shout out by Host di event
- Custom Roles
- Durasi 1 Bulan
- Role given : <@&${config.roles.cavernDread}> 

${config.emojis.blackBat}  The Midnight Covenant : IDR 35.000 /10M ${config.emojis.owoCash}
- Special Thanks & Shout out by Host di event
- Unlock VIP Voice
- Logo Contributor dicantumkan di poster (1x event)
- Durasi 1 Bulan
- Role given : <@&${config.roles.midnightCovenant}> 

${config.emojis.cards}   The Dread Legion : IDR 50.000 / 15M ${config.emojis.owoCash}
- Special Thanks & Shout out by Host di event
- Unlock VIP Voice
- Logo Contributor dicantumkan di poster (Semua event)
- Nama Sponsor dicantumkan pada caption di setiap event
- Durasi 1 Bulan
- Role Given : <@&${config.roles.dreadLegion}> 

${config.emojis.spider}  Abyssal Blade : IDR 75.000 / 20M ${config.emojis.owoCash}
- Mendapatkan Benefit Paket Abyssal Blade
- Unlock VIP Voice
- Mendapatkan Custom Role selama 1 bulan
- Durasi 2 Bulan
- Role Contributor eksklusif (2 bulan)
- Role Given : <@&${config.roles.abyssalBlade}> 

${config.emojis.darkWyvern}   Valkyrie  : IDR 100.000 / 30M ${config.emojis.owoCash}
- Mendapatkan Benefit Paket Valkyrie
- Mendapatkan Custom Role selama 2 bulan
- Durasi 4 bulan
- Unlock VIP Voice
- Role Given : <@&${config.roles.valkyrie}> 

- Any Question?
- Jika ada yang mau ditanyakan atau mau tahu info lebih lanjut, bisa langsung hubungi Admin yaa`);

    const small = new TextDisplayBuilder()
      .setContent(`**Jika ada kendala bug atau error dari bot, bisa langsung menghubungi:**
> ✮ <@${config.staffUsers?.executive || 'EXECUTIVE_ID'}> (Executive)
> ✮ <@${config.staffUsers?.supremeVisioner || 'VISIONER_ID'}> (Supreme Visioner)
> ✮ <@${config.staffUsers?.engineer || 'ENGINEER_ID'}> (Engineer)`
      );

    const container = new ContainerBuilder()
      .addMediaGalleryComponents(media)
      .addTextDisplayComponents(text)
      .addSeparatorComponents(sep)
      .addSectionComponents(button)
      .addSeparatorComponents(sep)
      .addMediaGalleryComponents(qris)
      .addSeparatorComponents(sep)
      .addTextDisplayComponents(small);

    await message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    try {
      await message.delete();
    } catch (error) {
      console.error('Failed to delete original message:', error);
    }
  }
};
