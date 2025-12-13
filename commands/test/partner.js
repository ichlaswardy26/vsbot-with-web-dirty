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
} = require("discord.js");
const config = require("../../config.js");

module.exports = {
    name: "partner",
    async exec(client, message) {

        await message.delete().catch(() => {});

        const sep = new SeparatorBuilder();

        const media = new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(
                "https://cdn.discordapp.com/attachments/1423692990974525571/1423949185014829129/Proyek_Baru_6_2251756.png"
            )
        );

        const button = [
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${config.emojis.ticket} **── Ticket**`
                    )
                )
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setCustomId("create_partner_ticket")
                        .setLabel("Buat Ticket")
                        .setStyle(ButtonStyle.Secondary)
                ),
        ];

        const text = new TextDisplayBuilder().setContent(
`── .✦ Halo semuanya! Kami dari 𝐕𝐢𝐥𝐥𝐚𝐢𝐧 𝐒𝐞𝐫𝐚𝐩𝐡𝐲𝐱 membuka kesempatan untuk partnership! 

⤹ Apa yang kami tawarkan? :
☾ - Promosi server kamu di channel khusus kami.
☾ - Komunitas aktif dan ramah.
☾ - Kerja sama saling menguntungkan untuk meningkatkan pertumbuhan komunitas kita.

⤹ Syarat partnership :
★ - Minimal 500 Member (Tidak termaksud bot)
★ - Aktif dalam promosi timbal balik
★ - Tidak mengandung konten melanggar TOS Discord.
★ - Tidak ada konten NSFW (Not Safe for Work)
★ - Villain Seraphyx tidak menerima partner dari server yang bersifat money/jualan/market place.

⤹ Notes :
⛧ - Mohon konfirmasi ke staff kami apabila ada pemutusan server, server tutup, pergantian staff, dsb.
⛧ - DILARANG keluar dari server tanpa alasan yang jelas, jika hal ini terjadi maka partner akan dilepas
⛧ - Perwakilan dari server diwajibkan hadir dalam event
⛧ - Jika perwakilan tidak ikut dalam event 3x berturut-turut, maka partnership akan dihentikan

Ambil Ticket di bawah untuk Ticket Partnership ˗ˏˋ ★ ˎˊ˗`
        );

        const small = new TextDisplayBuilder().setContent(
`**Jika ada kendala bug atau error dari bot, bisa langsung menghubungi:**
> ✮ <@${config.staffUsers.executive}> (Executive)
> ✮ <@${config.staffUsers.supremeVisioner}> (Supreme Visioner)
> ✮ <@${config.staffUsers.engineer}> (Engineer)`
        );

        const container = new ContainerBuilder()
            .setAccentColor(0xffffff)
            .addMediaGalleryComponents(media)
            .addSeparatorComponents(sep)
            .addTextDisplayComponents(text)
            .addSeparatorComponents(sep)
            .addSectionComponents(button)
            .addSeparatorComponents(sep)
            .addTextDisplayComponents(small);

        await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};