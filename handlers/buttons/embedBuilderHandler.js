const { EmbedBuilder } = require("discord.js");

module.exports = async (client, interaction) => {
  try {
    const userId = interaction.user.id;
    const embedState = client.embedBuilders.get(userId);
    
    if (!embedState) {
      return interaction.reply({ 
        content: "config.emojis.important **|** Sesi embed tidak ditemukan. Silakan mulai ulang proses pembuatan dengan `<prefix>createembed`.", 
        ephemeral: true 
      });
    }

    // Handle channel selection dropdown
    if (interaction.customId === "ce_channel_select" && interaction.isStringSelectMenu()) {
      try {
        const selectedChannelId = interaction.values[0];
        const channel = await client.channels.fetch(selectedChannelId);
        
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({ 
            content: "config.emojis.important **|** Channel tidak valid.", 
            ephemeral: true 
          });
        }
        
        // Create a clean version of the embed for sending
        const finalEmbed = new EmbedBuilder()
          .setTitle(embedState.embed.data.title || null)
          .setDescription(embedState.embed.data.description || null)
          .setColor(embedState.embed.data.color || "#FFFFFF")
          .setImage(embedState.embed.data.image?.url || null)
          .setThumbnail(embedState.embed.data.thumbnail?.url || null)
          .setFooter(embedState.embed.data.footer || null)
          .setTimestamp();

        await channel.send({ embeds: [finalEmbed] });
        
        // Delete temporary messages
        try {
          const previewMsg = await interaction.channel.messages.fetch(embedState.previewMessageId);
          const controlMsg = await interaction.channel.messages.fetch(embedState.controlMessageId);
          await previewMsg.delete();
          await controlMsg.delete();
        } catch (err) {
          console.error("Error deleting temporary messages:", err);
        }
        
        // Clean up state
        client.embedBuilders.delete(userId);
        return interaction.reply({ 
          content: `config.emojis.seraphyx **|** Embed berhasil dikirim ke channel <#${selectedChannelId}>!`, 
          ephemeral: true 
        });
        
      } catch (error) {
        console.error("Error sending embed:", error);
        return interaction.reply({ 
          content: "config.emojis.important **|** Gagal mengirimkan embed. Silakan coba lagi!.", 
          ephemeral: true 
        });
      }
    }

    // Handle button interactions
    if (interaction.isButton()) {
      // Get the control message to update its description
      const controlMsg = await interaction.channel.messages.fetch(embedState.controlMessageId);
      
      // Map button actions to prompt text and field type
      let promptText = "";
      // let fieldType = "";
      let baseDescription = "Gunakan tombol di bawah ini untuk menyesuaikan embed kamu:\n\n" +
          "**Set Title** - Input title untuk embed\n" +
          "**Set Description** - Input deskripsi untuk embed\n" +
          "**Set Image** - Tambahkan gambar (upload file atau masukan URL)\n" +
          "**Set Thumbnail** - Tambahkan gambar thumbnail (upload atau ketik 'default' menggunakan icon server)\n" +
          "**Set Footer** - Input Footer\n" +
          "**Set Color** - Ganti warna embed (hex code)";
      
      switch (interaction.customId) {
        case "ce_cancel_embed": {
          // Handle cancellation
          const cancelEmbed = new EmbedBuilder()
            .setTitle("config.emojis.important **|** Embed Cancelled")
            .setDescription("Proses pembuatan embed telah dibatalkan.")
            .setColor("#FF0000");
          
          await controlMsg.edit({ embeds: [cancelEmbed], components: [] });
          
          // Cleanup: Delete preview message and remove state
          try {
            const previewMsg = await interaction.channel.messages.fetch(embedState.previewMessageId);
            await previewMsg.delete();
          } catch (err) {
            console.error("Error deleting preview message:", err);
          }
          
          client.embedBuilders.delete(userId);
          return interaction.reply({ 
            content: "config.emojis.seraphyx **|** Pembuatan  embed diberhentikan.", 
            ephemeral: true 
          });
        }
          
        case "ce_set_title":
          promptText = "📝 Silahkan input title (maksimal 256 karakter):";
          // fieldType = "title";
          break;
        case "ce_set_desc":
          promptText = "📄 Silakan input deskripsi (maksimal 4096 karakter):";
          // fieldType = "description";
          break;
        case "ce_set_image":
          promptText = "🖼️ Silakan upload file gambar atau berikan URL gambar yang valid untuk embed:";
          break;
        case "ce_set_thumbnail":
          promptText = "🖼️ Silakan upload gambar untuk thumbnail atau ketik `default` untuk menggunakan ikon server:";
          break;
        case "ce_set_footer":
          promptText = "📋 Silakan input teks footer (maksimal 2048 karakter):";
          break;
        case "ce_set_color":
          promptText = "🎨 Silakan input hex code (contoh: `#FF5733`, `#00FF00`):";
          // fieldType = "color";
          break;
        default:
          return interaction.reply({ 
            content: "config.emojis.important **|** Unknown action.", 
            ephemeral: true 
          });
      }
      
      // Update the control panel with instructions
      const updatedEmbed = new EmbedBuilder()
        .setTitle("🎨 Embed Control Panel")
        .setDescription(`${promptText}`)
        .setColor("#2F3136");
      
      await controlMsg.edit({ embeds: [updatedEmbed] });
      
      // Just acknowledge the interaction without showing any message
      await interaction.deferUpdate();
      
      // Set up a message collector for the current channel filtered to the user
      const filter = m => m.author.id === userId;
      const collector = interaction.channel.createMessageCollector({ 
        filter, 
        time: 60000, 
        max: 1 
      });
      
      collector.on("collect", async (m) => {
        try {
          // Delete the input message immediately
          if (m.deletable) {
            m.delete().catch(() => {});
          }
          
          let updateSuccess = true;
          let errorMessage = "";
          
          // Update the embed based on which button was clicked
          if (interaction.customId === "ce_set_title") {
            if (m.content.length > 256) {
              errorMessage = "config.emojis.important **|** Title harus 256 karakter atau kurang.";
              updateSuccess = false;
            } else {
              embedState.embed.setTitle(m.content);
            }
          } else if (interaction.customId === "ce_set_desc") {
            if (m.content.length > 4096) {
              errorMessage = "config.emojis.important **|** Deskripsi harus 4096 karakter atau kurang.";
              updateSuccess = false;
            } else {
              embedState.embed.setDescription(m.content);
            }
          } else if (interaction.customId === "ce_set_image") {
            // Check for file attachment first
            if (m.attachments.size > 0) {
              const attachment = m.attachments.first();
              if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                embedState.embed.setImage(attachment.url);
              } else {
                errorMessage = "config.emojis.important **|** Upload image file yang valid.";
                updateSuccess = false;
              }
            } else {
              // Fall back to URL validation
              const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
              if (!urlPattern.test(m.content)) {
                errorMessage = "config.emojis.important **|** Masukan link url image yang valid (jpg, jpeg, png, gif, webp) atau upload image file.";
                updateSuccess = false;
              } else {
                embedState.embed.setImage(m.content);
              }
            }
          } else if (interaction.customId === "ce_set_thumbnail") {
            if (m.attachments.size > 0) {
              const attachment = m.attachments.first();
              if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                embedState.embed.setThumbnail(attachment.url);
              } else {
                errorMessage = "config.emojis.important **|** Upload image file yang valid.";
                updateSuccess = false;
              }
            } else if (m.content.toLowerCase() === "default") {
              const guildIcon = interaction.guild.iconURL();
              if (guildIcon) {
                embedState.embed.setThumbnail(guildIcon);
              } else {
                errorMessage = "config.emojis.important **|** Server belum mempunyai icon.";
                updateSuccess = false;
              }
            } else {
              errorMessage = "config.emojis.important **|** Upload image file atau ketik `default` untuk menggunakan server icon.";
              updateSuccess = false;
            }
          } else if (interaction.customId === "ce_set_footer") {
            if (m.content.length > 2048) {
              errorMessage = "config.emojis.important Footer harus 2048 karakter atau kurang.";
              updateSuccess = false;
            } else {
              embedState.embed.setFooter({ text: m.content });
            }
          } else if (interaction.customId === "ce_set_color") {
            // Validate hex code format
            const hexPattern = /^#[0-9A-Fa-f]{6}$/;
            if (!hexPattern.test(m.content.trim())) {
              errorMessage = "config.emojis.important **|** Format warna tidak valid. Gunakan 6-digit hex code: `#FF5733`.";
              updateSuccess = false;
            } else {
              embedState.embed.setColor(m.content.trim());
            }
          }

          if (!updateSuccess) {
            // Update control panel with error message
            const errorEmbed = new EmbedBuilder()
              .setTitle("🎨 Embed Control Panel")
              .setDescription(`${baseDescription}\n\n**ERROR:**\n${errorMessage}\n\n${promptText}`)
              .setColor("#FF0000");
            
            await controlMsg.edit({ embeds: [errorEmbed] });
            return;
          }

          // Update the preview message with the new embed
          try {
            const channel = interaction.channel;
            const previewMsg = await channel.messages.fetch(embedState.previewMessageId);
            await previewMsg.edit({ embeds: [embedState.embed] });
            
            // Reset control panel to default state
            const successEmbed = new EmbedBuilder()
              .setTitle("🎨 Embed Control Panel")
              .setDescription(baseDescription)
              .setColor("#2F3136");
            
            await controlMsg.edit({ embeds: [successEmbed] });
          } catch (err) {
            console.error("Error updating preview message:", err);
            // Update control panel with error message instead of ephemeral
            const errorEmbed = new EmbedBuilder()
              .setTitle("🎨 Embed Control Panel")
              .setDescription(`${baseDescription}\n\n**ERROR:**\nconfig.emojis.important **|** Error saat update preview. Silakan coba lagi!.`)
              .setColor("#FF0000");
            
            await controlMsg.edit({ embeds: [errorEmbed] });
          }
        } catch (error) {
          console.error("Error processing input:", error);
          // Update control panel with error message instead of ephemeral
          const errorEmbed = new EmbedBuilder()
            .setTitle("🎨 Embed Control Panel")
            .setDescription(`${baseDescription}\n\n**ERROR:**\nconfig.emojis.important **|** Error saat memasukan inputmu.`)
            .setColor("#FF0000");
          
          await controlMsg.edit({ embeds: [errorEmbed] }).catch(() => {});
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          // Reset control panel if no input was received
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("🎨 Embed Control Panel")
            .setDescription(`⏰ **|** Input dihentikan setelah 60 seconds. Silakan coba lagi!.`)
            .setColor("#FFA500");
          
          controlMsg.edit({ embeds: [timeoutEmbed] }).catch(() => {});
        }
      });
    }
    
  } catch (error) {
    console.error("Error in embed builder handler:", error);
    
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ 
        content: "config.emojis.important **|** Terjadi error!.", 
        ephemeral: true 
      });
    }

  }
};

