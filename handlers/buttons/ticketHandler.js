const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const config = require('../../config');
const Ticket = require('../../schemas/Ticket');
const createTranscript = require('../../util/createTranscript');

/**
 * Handle ticket-related button interactions
 * @param {Client} client Discord client instance
 * @param {Interaction} interaction Button interaction object
 */
async function ticketHandler(client, interaction) {
  // Handle create ticket button
  if (interaction.customId === "create_ticket") {
    const existing = interaction.guild.channels.cache.find(
      c => c.name.includes(`ticket-${interaction.user.username.toLowerCase()}`)
    );
    if (existing) {
      return interaction.reply({
        content: "? Kamu sudah memiliki tiket terbuka.",
        flags: 64, // menggantikan ephemeral: true
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select_ticket_subject")
      .setPlaceholder("Pilih subject tiket kamu...")
      .addOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel("Pertanyaan")
          .setValue("question")
          .setEmoji(config.emojis.question),
        new StringSelectMenuOptionBuilder()
          .setLabel("Report")
          .setValue("report")
          .setEmoji(config.emojis.report),
        new StringSelectMenuOptionBuilder()
          .setLabel("Ban Appeal")
          .setValue("ban_appeal")
          .setEmoji(config.emojis.ban),
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: "?? Silakan pilih subject tiket kamu:",
      components: [row],
      flags: 64, // menggantikan ephemeral: true
    });
  }

  // Handle ticket subject selection
  if (interaction.customId === "select_ticket_subject") {
    const subject = interaction.values[0];
    const subjectLabels = {
      question: "pertanyaan",
      report: "report",
      ban_appeal: "ban-appeal",
    };

    const subjectName = subjectLabels[subject] || "lainnya";
    const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    const ticketCategoryId = client.config.categories?.ticket || client.config.ticketCategoryId;
    const staffRoleId = client.config.roles?.staff || client.config.staffRoleId;
    
    console.log('Creating ticket channel with category:', ticketCategoryId);
    console.log('Staff role ID:', staffRoleId);

    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: ticketCategoryId,
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
        ...(staffRoleId ? [{
          id: staffRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        }] : []),
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
        .setLabel("? Tutup Tiket")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle("?? Tiket Dibuka")
      .setFields(
        { name: "User", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Subject", value: subjectName, inline: true }
      )
      .setColor('White')
      .setTimestamp();

    await channel.send({
      content: `Halo <@${interaction.user.id}>! Sudah membuka tiket.\nSilakan jelaskan lebih lanjut dan tunggu staff merespon ${subjectName} darimu.`,
      embeds: [embed],
      components: [closeButton],
    });

    return interaction.update({
      content: `? Tiket dengan subject **${subjectName}** telah dibuat: ${channel}`,
      components: [],
      flags: 64, // menggantikan ephemeral: true
    });
  }

  // Handle close ticket button
  if (interaction.customId === "close_ticket") {
    console.log('Close ticket button clicked by:', interaction.user.username);
    
    const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
    if (!ticket) {
      console.log('Ticket not found in database for channel:', interaction.channel.id);
      return interaction.reply({
        content: "❌ Tidak menemukan data tiket di database.",
        flags: 64,
      });
    }

    console.log('Ticket found:', ticket);
    console.log('Staff role ID from config:', client.config.staffRoleId);
    console.log('User roles:', interaction.member.roles.cache.map(r => r.id));

    const member = interaction.member;
    const staffRoleId = client.config.roles?.staff || client.config.staffRoleId;
    
    // Check if user has staff role or is ticket owner
    const hasStaffRole = staffRoleId && member.roles.cache.has(staffRoleId);
    const isTicketOwner = ticket.userId === interaction.user.id;
    
    console.log('Has staff role:', hasStaffRole);
    console.log('Is ticket owner:', isTicketOwner);
    
    if (!hasStaffRole && !isTicketOwner) {
      return interaction.reply({
        content: "❌ Hanya staff atau pemilik tiket yang dapat menutup tiket ini.",
        flags: 64,
      });
    }

    console.log('Closing ticket...');
    
    try {
      ticket.status = "closed";
      ticket.closedAt = new Date();
      await ticket.save();
      console.log('Ticket saved to database');
    } catch (err) {
      console.error('Error saving ticket to database:', err);
      return interaction.reply({
        content: "❌ Gagal menyimpan data tiket ke database.",
        flags: 64,
      });
    }

    const logChannelId = client.config.ticketLogChannelId || client.config.channels?.ticketLogs;
    const logChannel = logChannelId ? interaction.guild.channels.cache.get(logChannelId) : null;
    
    console.log('Log channel ID:', logChannelId);
    console.log('Log channel found:', !!logChannel);

    let transcript;
    try {
      transcript = await createTranscript(interaction.channel);
      console.log('Transcript created successfully');
    } catch (err) {
      console.error("Gagal membuat transkrip:", err);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle("🎫 Tiket Ditutup")
      .addFields(
        { name: "👤 User", value: `<@${ticket.userId}>`, inline: true },
        { name: "📝 Channel", value: `#${interaction.channel.name}`, inline: true },
        { name: "Dibuka", value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true },
        { name: "Ditutup", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        { name: "Ditutup oleh", value: `<@${interaction.user.id}>`, inline: true }
      )
      .setColor(0xff3e3e)
      .setTimestamp();

    try {
      if (logChannel) {
        if (transcript) {
          await logChannel.send({
            embeds: [logEmbed],
            files: [transcript],
          });
        } else {
          await logChannel.send({
            content: `🎫 Tiket ditutup: ${interaction.channel.name} (gagal membuat transkrip)`,
            embeds: [logEmbed]
          });
        }
        console.log('Log sent to log channel');
      } else {
        console.log('No log channel configured or found');
      }
    } catch (err) {
      console.error("Gagal kirim log ke channel log tiket:", err.message);
    }

    await interaction.reply({
      content: "🔒 Tiket akan ditutup dalam 5 detik...",
      flags: 64,
    });

    console.log('Scheduling channel deletion in 5 seconds...');
    setTimeout(() => {
      console.log('Deleting channel...');
      interaction.channel.delete().catch(err => {
        console.error('Error deleting channel:', err);
      });
    }, 5000);
  }
}

module.exports = ticketHandler;
