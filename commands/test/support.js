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

module.exports = {
    name: 'sup',
    async exec(client, message) {

        // Delete message safely after sending response
        const deleteOriginal = async () => {
            try {
                await message.delete();
            } catch (error) {
                console.error('Failed to delete original message:', error);
            }
        };

        const sep = new SeparatorBuilder()

        const media = new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL("https://media.discordapp.net/attachments/1423692990974525571/1423977785562763325/Proyek_Baru_6_252D9C7.png?ex=68e24628&is=68e0f4a8&hm=7689aa0b9b8f55f8aa8a43e7e77575c47ae11e4012a0e37894b818eff3c76fe0&=&format=webp&quality=lossless&width=1318&height=439")
        )
        const qris = new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL("https://cdn.discordapp.com/attachments/1423692990974525571/1423943797640925204/qr.png?ex=68e22680&is=68e0d500&hm=ecbc023094a752a095dc4973f3bdfc2b8ec4c74b631a175cdb690758b0156844&")
        )

        const button = [
            new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`<:tako:1423946058102345832> **── Tako**`))
            .setButtonAccessory(
                new ButtonBuilder()
                .setLabel(`Tako.id`)
                .setURL(`https://tako.id/richiee`)
                .setStyle(ButtonStyle.Link)
            ),
            new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`<:owocash:1324276422679986196> **── Owo Cash**`))
            .setButtonAccessory(
                new ButtonBuilder()
                .setLabel(`Owo Cash`)
                .setURL(`https://discord.com/channels/734009169170137098/1409830413232377856`)
                .setStyle(ButtonStyle.Link)
            ),
        ]

        const text = new TextDisplayBuilder()
        .setContent(`𝑷𝒂𝒌𝒆𝒕 𝑺𝒖𝒑𝒑𝒐𝒓𝒕 <a:black_boost:1406332177880318023> 
↓
 <:1037cross:1419307001371951144> Cavern of Dread : IDR 15.000 /5M <:owocash:1324276422679986196>
- Special Thanks & Shout out by Host di event
- Custom Roles
- Durasi 1 Bulan
- Role given : <@&1368198158680719390> 

<:2783blackbat:1419306818991034398>  The Midnight Covenant : IDR 35.000 /10M <:owocash:1324276422679986196>
- Special Thanks & Shout out by Host di event
- Unlock VIP Voice
- Logo Contributor dicantumkan di poster (1x event)
- Durasi 1 Bulan
- Role given : <@&1368197873086238803> 

<:675510cards:1419307055541649459>   The Dread Legion : IDR 50.000 / 15M <:owocash:1324276422679986196>
- Special Thanks & Shout out by Host di event
- Unlock VIP Voice
- Logo Contributor dicantumkan di poster (Semua event)
- Nama Sponsor dicantumkan pada caption di setiap event
- Durasi 1 Bulan
- Role Given : <@&1310613443690237983> 

<:6721spider:1419306783838830843>  Abyssal Blade : IDR 75.000 / 20M <:owocash:1324276422679986196>
- Mendapatkan Benefit Paket Abyssal Blade
- Unlock VIP Voice
- Mendapatkan Custom Role selama 1 bulan
- Durasi 2 Bulan
- Role Contributor eksklusif (2 bulan)
- Role Given : <@&1319526216302329896> 

<:398121darkwyvern:1419307036268826710>   Valkyrie  : IDR 100.000 / 30M <:owocash:1324276422679986196>
- Mendapatkan Benefit Paket Valkyrie
- Mendapatkan Custom Role selama 2 bulan
- Durasi 4 bulan
- Unlock VIP Voice
- Role Given : <@&1319526216302329896> 

- Any Question?
- Jika ada yang mau ditanyakan atau mau tahu info lebih lanjut, bisa langsung hubungi Admin yaa`)

        const small = new TextDisplayBuilder()
        .setContent(`**Jika ada kendala bug atau error dari bot, bisa langsung menghubungi:**
> ✮ <@707254056535588924> (Executive)
> ✮ <@1322543566404456500> (Supreme Visioner)
> ✮ <@372727563514281984> (Engineer)`
        );

        const container = new ContainerBuilder()
        .addMediaGalleryComponents(media)
        .addTextDisplayComponents(text)
        .addSeparatorComponents(sep)
        .addSectionComponents(button)
        .addSeparatorComponents(sep)
        .addMediaGalleryComponents(qris)
        .addSeparatorComponents(sep)
        .addTextDisplayComponents(small)

        await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        // Delete original message after successful send
        await deleteOriginal();
    }
}