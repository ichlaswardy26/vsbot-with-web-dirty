const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const ConfessionState = require('../../schemas/ConfessionState');
const config = require('../../config.js');

/**
 * Handle confession-related button interactions
 * @param {Client} client Discord client instance
 * @param {Interaction} interaction Button interaction object
 */
async function confessionHandler(client, interaction) {
  console.log('Confession handler called with customId:', interaction.customId);
  
  // Handle submit confession button
  if (interaction.customId === 'submit_confession') {
    const modal = new ModalBuilder()
      .setCustomId('modal_submit_confession')
      .setTitle('📝 Submit');

    const text = new TextInputBuilder()
      .setCustomId('confession_text')
      .setLabel('Masukkan isi confession kamu:')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(text);
    modal.addComponents(row);

    return await interaction.showModal(modal);
  }

  // Handle reply confession button
  if (interaction.customId === 'reply_confession') {
    // Store the original message ID for reply reference
    const originalMessageId = interaction.message.id;
    
    const modal = new ModalBuilder()
      .setCustomId(`modal_reply_confession_${originalMessageId}`)
      .setTitle('💬 Balas Confession');

    const text = new TextInputBuilder()
      .setCustomId('reply_text')
      .setLabel('Masukkan balasan kamu:')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(text);
    modal.addComponents(row);

    return await interaction.showModal(modal);
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    console.log('Modal submit detected:', interaction.customId);
    
    try {
    
    const confessionChannelId = config.channels.confession;
    const confessionChannel = confessionChannelId ? interaction.guild.channels.cache.get(confessionChannelId) : null;

    if (!confessionChannel?.isTextBased()) {
      console.log('Confession channel not found or not text-based');
      return await interaction.reply({
        content: "❌ Channel confession tidak ditemukan.",
        ephemeral: true,
      });
    }

    let confessionText;
    let Judul;
    let Warna;
    let originalMessageId = null;

    if (interaction.customId === "modal_submit_confession") {
      console.log('Processing new confession submission');
      confessionText = interaction.fields.getTextInputValue("confession_text");
      Judul = "📨 Confession Baru";
      Warna = "Random";
    } else if (interaction.customId.startsWith("modal_reply_confession_")) {
      console.log('Processing confession reply submission');
      confessionText = interaction.fields.getTextInputValue("reply_text");
      Judul = "💬 Balasan untuk Confession";
      Warna = "Green";
      
      // Extract original message ID from custom ID
      originalMessageId = interaction.customId.replace("modal_reply_confession_", "");
      console.log('Original message ID extracted:', originalMessageId);
    } else {
      console.log('Unknown modal submission type:', interaction.customId);
      return await interaction.reply({
        content: "❌ Tipe modal tidak dikenali.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(Judul)
      .setDescription(confessionText)
      .setColor(Warna)
      .setFooter({ text: "Dikirim secara anonim" });

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("submit_confession")
        .setLabel("📝 Submit")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("reply_confession")
        .setLabel("💬 Reply")
        .setStyle(ButtonStyle.Secondary)
    );

    let sentMsg;

    // If this is a reply, send as reply to original message
    if (originalMessageId) {
      console.log('Attempting to reply to message ID:', originalMessageId);
      try {
        const originalMessage = await confessionChannel.messages.fetch(originalMessageId);
        if (originalMessage) {
          console.log('Original message found, sending reply');
          sentMsg = await originalMessage.reply({
            embeds: [embed],
            components: [buttonRow],
          });
          console.log('Reply sent successfully');
        } else {
          console.log('Original message not found, sending as normal message');
          // If original message not found, send as normal message
          sentMsg = await confessionChannel.send({
            embeds: [embed],
            components: [buttonRow],
          });
        }
      } catch (error) {
        console.error('Error replying to original confession:', error);
        // Fallback to normal send
        sentMsg = await confessionChannel.send({
          embeds: [embed],
          components: [buttonRow],
        });
      }
    } else {
      // Remove buttons from previous confession message for new confessions
      const previousMsgId = client.lastConfessionMessage?.get(interaction.guild.id);
      if (previousMsgId) {
        try {
          const oldMsg = await confessionChannel.messages.fetch(previousMsgId);
          if (oldMsg) await oldMsg.edit({ components: [] });
        } catch (err) {
          console.log("Gagal hapus tombol dari pesan sebelumnya:", err.message);
        }
      }

      // Send new confession embed
      sentMsg = await confessionChannel.send({
        embeds: [embed],
        components: [buttonRow],
      });
    }

    // Send log to log channel if available
    const logChannelIdConfes = config.channels.confessionLog;
    const logChannelConfes = logChannelIdConfes ? interaction.guild.channels.cache.get(logChannelIdConfes) : null;

    if (logChannelConfes?.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setTitle("📥 Confession Log")
        .addFields(
          { name: "Type", value: Judul.includes("Balasan") ? "Reply" : "Confession", inline: true },
          { name: "Author", value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
          { name: "Guild", value: `${interaction.guild.name} (${interaction.guild.id})` },
        )
        .setDescription(confessionText)
        .setColor("Orange")
        .setTimestamp();

      logChannelConfes.send({ embeds: [logEmbed] }).catch(console.error);
    }

    // Save last confession message ID only for new confessions (not replies)
    if (!originalMessageId) {
      if (!client.lastConfessionMessage) {
        client.lastConfessionMessage = new Map();
      }
      client.lastConfessionMessage.set(interaction.guild.id, sentMsg.id);
      await ConfessionState.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { lastMessageId: sentMsg.id },
        { upsert: true, new: true }
      );
    }

    const successMessage = originalMessageId 
      ? "✅ Balasan berhasil dikirim secara anonim!" 
      : "✅ Confession berhasil dikirim secara anonim!";
      
    try {
      await interaction.reply({
        content: successMessage,
        ephemeral: true,
      });
      console.log('Success message sent to user');
    } catch (error) {
      console.error('Error sending success message:', error);
    }
    
    } catch (error) {
      console.error('Error in confession modal submission:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ Terjadi kesalahan saat memproses confession. Silakan coba lagi.",
            ephemeral: true,
          });
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  }
}

module.exports = confessionHandler;
