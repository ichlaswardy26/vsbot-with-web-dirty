const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const VoiceChannelModel = require("../schemas/voiceChannel");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("vc-bitrate-")) return;

    const voiceId = interaction.customId.split("vc-bitrate-")[1];
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
      .setCustomId(`vc-bitrate-modal-${voiceId}`)
      .setTitle("Atur Bitrate Voice Channel");

    const input = new TextInputBuilder()
      .setCustomId("vc-new-bitrate")
      .setLabel("Bitrate (kbps, max 384)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  });
};