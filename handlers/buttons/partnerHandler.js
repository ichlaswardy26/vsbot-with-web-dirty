const {
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const PartnerTicket = require("../../schemas/PartnerTicket");
const config = require("../../config");

async function partnerHandler(client, interaction) {
  const staffRoleId = config.roles.staff;
  const categoryId = config.categories.partner;

  // 🟢 Tombol buat ticket
  if (interaction.customId === "create_partner_ticket") {
    const existing = interaction.guild.channels.cache.find(
      (c) => c.name === `partner-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`
    );
    if (existing) {
      return interaction.reply({
        content: `⚠️ Kamu sudah memiliki tiket aktif: ${existing}`,
        flags: 64,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("partner_modal")
      .setTitle("🤝 Partnership Request");

    const serverName = new TextInputBuilder()
      .setCustomId("partner_server_name")
      .setLabel("Nama Server:")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("Contoh: Villain Seraphyx");

    const serverLink = new TextInputBuilder()
      .setCustomId("partner_server_link")
      .setLabel("Link Server:")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("https://discord.gg/...");

    const confirmReq = new TextInputBuilder()
      .setCustomId("partner_read_req")
      .setLabel("Baca Requirement?:")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("yes/no");

    modal.addComponents(
      new ActionRowBuilder().addComponents(serverName),
      new ActionRowBuilder().addComponents(serverLink),
      new ActionRowBuilder().addComponents(confirmReq)
    );

    return interaction.showModal(modal);
  }

  // 🟡 Ketika modal disubmit
  if (interaction.isModalSubmit() && interaction.customId === "partner_modal") {
    await interaction.deferReply({ flags: 64 });

    const serverName = interaction.fields.getTextInputValue("partner_server_name");
    const serverLink = interaction.fields.getTextInputValue("partner_server_link");
    const confirmReq = interaction.fields.getTextInputValue("partner_read_req");

    const guild = interaction.guild;
    const ticketName = `partner-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    const channel = await guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        {
          id: staffRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels,
          ],
        },
      ],
    });

    await PartnerTicket.create({
      guildId: guild.id,
      userId: interaction.user.id,
      channelId: channel.id,
      serverName,
      serverLink,
      confirmReq,
      createdAt: new Date(),
      status: "open",
    });

    const embed = new EmbedBuilder()
      .setTitle(`${config.emojis.partner} | Partnership Ticket Dibuka`)
      .setColor("White")
      .setDescription(
        `**Nama Server:** ${serverName}\n` +
        `**Link Server:** ${serverLink}\n` +
        `**Sudah Baca Requirement:** ${confirmReq}`
      )
      .setFooter({ text: `Dibuat oleh ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({
      content: `<@${interaction.user.id}> | Silahkan tunggu respon dari <@&${staffRoleId}>!`,
      embeds: [embed],
    });

    return interaction.editReply({
      content: `✅ Tiket Partnership kamu berhasil dibuat di ${channel}.`,
    });
  }
}

module.exports = partnerHandler;