const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const VoiceChannelModel = require("../schemas/voiceChannel");

// handlers/vc-rename.js
module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("vc-rename-")) return;

    const voiceId = interaction.customId.split("vc-rename-")[1];
    if (!voiceId) return;

    const voiceData = await VoiceChannelModel.findOne({ channelId: voiceId });
    if (!voiceData) {
      return interaction.reply({ content: "Data voice channel tidak ditemukan.", ephemeral: true });
    }

    const isOwner = interaction.user.id === voiceData.ownerId;
    const isTrusted = voiceData.allowedControllers.includes(interaction.user.id);

    if (!isOwner && !isTrusted) {
      return interaction.reply({ content: "Kamu tidak memiliki izin untuk mengganti nama voice ini.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`vc-rename-modal-${voiceId}`)
      .setTitle("Ubah Nama Voice Channel");

    const input = new TextInputBuilder()
      .setCustomId("vc-new-name")
      .setLabel("Nama Baru Voice Channel")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  });
};