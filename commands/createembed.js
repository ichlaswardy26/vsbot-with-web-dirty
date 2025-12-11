const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType } = require("discord.js");

module.exports = {
  name: "createembed",
  description: "Interactively create a custom embed",
  category: "utility",
  async exec(client, message, args) {
    try {
      // Initialize embed state with default values
      const embedState = {
        embed: new EmbedBuilder()
          .setDescription("*Preview embed - gunakan tombol dibawah untuk mengatur embed!*")
          .setColor("#FFFFFF"),
        previewMessageId: null,
        controlMessageId: null,
        channelId: message.channel.id
      };

      // Save the state for this user
      client.embedBuilders.set(message.author.id, embedState);

      // Send Preview Embed
      const previewMsg = await message.channel.send({ embeds: [embedState.embed] });
      embedState.previewMessageId = previewMsg.id;

      // Create the Control Panel Embed with Instructions
      const controlEmbed = new EmbedBuilder()
        .setTitle("🎨 Embed Control Panel")
        .setDescription(
          "Gunakan tombol di bawah ini untuk menyesuaikan embed kamu:\n\n" +
          "**Set Title** - Input title untuk embed\n" +
          "**Set Description** - Input deskripsi untuk embed\n" +
          "**Set Image** - Tambahkan gambar (upload file atau masukan URL)\n" +
          "**Set Thumbnail** - Tambahkan gambar thumbnail (upload atau ketik 'default' menggunakan icon server)\n" +
          "**Set Footer** - Input Footer\n" +
          "**Set Color** - Ganti warna embed (hex code)"
        )
        .setColor("#2F3136");

      // Build Control Buttons (split into two rows for better layout)
      const buttonRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ce_set_title").setLabel("Set Title").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ce_set_desc").setLabel("Set Description").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ce_set_image").setLabel("Set Image").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ce_set_thumbnail").setLabel("Set Thumbnail").setStyle(ButtonStyle.Primary)
      );

      const buttonRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ce_set_footer").setLabel("Set Footer").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ce_set_color").setLabel("Set Color").setStyle(ButtonStyle.Primary)
      );

      // Add Cancel Button
      const cancelButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ce_cancel_embed")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger)
      );
      
      // Get all text channels in the guild for the dropdown
      const textChannels = message.guild.channels.cache.filter(
        channel => channel.type === ChannelType.GuildText && 
        channel.permissionsFor(message.guild.members.me).has('SendMessages')
      );
      
      // Create channel selection dropdown
      const channelOptions = textChannels.map(channel => {
        return {
          label: channel.name,
          value: channel.id,
          description: `Kirim embed ke #${channel.name}`
        };
      }).slice(0, 25); // Discord only allows 25 options in a dropdown
      
      const channelSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ce_channel_select')
          .setPlaceholder('Pilih channel untuk dikirimkan!')
          .addOptions(channelOptions)
      );

      const controlMsg = await message.channel.send({ 
        embeds: [controlEmbed], 
        components: [buttonRow1, buttonRow2, channelSelect, cancelButtonRow] 
      });
      embedState.controlMessageId = controlMsg.id;

      // Delete the original command message to keep channel clean
      if (message.deletable) {
        await message.delete();
      }

    } catch (error) {
      console.error("Error starting embed creation:", error);
      message.reply("<a:important:1367186288297377834> **|** Terjadi kesalahan saat membuat embed builder. Silakan coba lagi.");
    }
  }
};
