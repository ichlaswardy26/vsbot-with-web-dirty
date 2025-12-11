/*const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionsBitField,
  AttachmentBuilder,
  EmbedBuilder
} = require("discord.js");

const Ticket = require("../../schemas/Ticket");
const createTranscript = require("../../util/createTranscript");

module.exports = {
  name: "interactionCreate",
  async exec(client, interaction) {
    // ✅ STEP 1: Klik tombol buka tiket → munculkan select menu
    if (interaction.isButton() && interaction.customId === "create_ticket") {
      const existing = interaction.guild.channels.cache.find(
        c => c.name.includes(`ticket-${interaction.user.username.toLowerCase()}`)
      );
      if (existing) {
        return interaction.reply({
          content: "❗ Kamu sudah memiliki tiket terbuka.",
          ephemeral: true,
        });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId("select_ticket_subject")
        .setPlaceholder("Pilih subject tiket kamu...")
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel("Pertanyaan").setDescription("Bertanya").setValue("question").setEmoji("❓"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Report").setValue("report").setEmoji("🚨"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Ban Appeal").setValue("ban_appeal").setEmoji("🔨"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Partnership").setValue("partnership").setEmoji("🤝"),
        ]);

      const row = new ActionRowBuilder().addComponents(menu);

      return interaction.reply({
        content: "📝 Silakan pilih subject tiket kamu:",
        components: [row],
        ephemeral: true,
      });
    }

    // ✅ STEP 2: User memilih subject → buat channel
    if (interaction.isStringSelectMenu() && interaction.customId === "select_ticket_subject") {
      const subject = interaction.values[0];
      const subjectLabels = {
        question: "pertanyaan",
        report: "report",
        ban_appeal: "ban-appeal",
        partnership: "partnership",
      };

      const subjectName = subjectLabels[subject] || "lainnya";
      const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: client.config.ticketCategoryId,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
          {
            id: client.config.staffRoleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
        ],
      });

      await Ticket.create({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        channelId: channel.id,
        subject,
        createdAt: new Date(),
        status: "open",
      });

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("❌ Tutup Tiket")
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setTitle("🎫 Tiket Dibuka")
        .setFields(
          { name: "User", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Subject", value: subjectName, inline: true }
        )
        .setColor(0x00b0f4)
        .setTimestamp();

      await channel.send({
        content: `Halo <@${interaction.user.id}>! Sudah membuka tiket.\nSilakan jelaskan lebih lanjut dan tunggu <@&${client.config.staffRoleId}> merespon ${subjectName} darimu.`,
        embeds: [embed],
        components: [closeButton],
      });

      return interaction.update({
        content: `✅ Tiket dengan subject **${subjectName}** telah dibuat: ${channel}`,
        components: [],
        ephemeral: true,
      });
    }

    // ✅ STEP 3: Tutup tiket → buat transkrip → kirim ke log → hapus channel
    if (interaction.isButton() && interaction.customId === "close_ticket") {
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) {
        return interaction.reply({
          content: "❌ Tidak menemukan data tiket di database.",
          ephemeral: true,
        });
      }
      const member = interaction.guild.members.cache.get(interaction.user.id);
      if (!member.roles.cache.has(client.config.staffRoleId)) {
        return interaction.reply({
          content: "❌ Hanya yang memiliki izin dapat menutup tiket.",
          ephemeral: true,
        });
      }

      ticket.status = "closed";
      ticket.closedAt = new Date();
      await ticket.save();

      const logChannel = interaction.guild.channels.cache.get(client.config.ticketLogChannelId);

      let transcript;
      try {
        transcript = await createTranscript(interaction.channel);
      } catch (err) {
        console.error("Gagal membuat transkrip:", err);
      }

      const logEmbed = new EmbedBuilder()
        .setTitle("📁 Tiket Ditutup")
        .addFields(
          { name: "👤 User", value: `<@${ticket.userId}>`, inline: true },
          { name: "📂 Channel", value: `#${interaction.channel.name}`, inline: true },
          { name: "Dibuka", value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true },
          { name: "Ditutup", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setColor(0xff3e3e)
        .setTimestamp();

      await logChannel.send({
        embeds: [logEmbed],
        files: transcript ? [transcript] : [],
      })
      } else if (logChannel) {
        await logChannel.send(`📁 Tiket ditutup: ${interaction.channel.name} (gagal membuat transkrip)`);
      }

      await interaction.reply({
        content: "⏳ Tiket akan ditutup dalam 5 detik...",
        ephemeral: true,
      });

      setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
    }
  }*/