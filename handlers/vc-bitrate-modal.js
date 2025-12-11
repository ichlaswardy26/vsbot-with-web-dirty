module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("vc-bitrate-modal-")) return;

    const voiceId = interaction.customId.split("vc-bitrate-modal-")[1];
    const bitrateInput = interaction.fields.getTextInputValue("vc-new-bitrate");
    const bitrate = parseInt(bitrateInput) * 1000;

    const channel = interaction.guild.channels.cache.get(voiceId);
    if (!channel || channel.type !== 2 || isNaN(bitrate) || bitrate < 8000 || bitrate > 384000) {
      return interaction.reply({ content: `❌ Bitrate tidak valid. Harus antara 8 dan 384 kbps.`, ephemeral: true });
    }

    await channel.setBitrate(bitrate).catch(() => {});
    await interaction.reply({ content: `✅ Bitrate telah diubah menjadi \`${bitrate / 1000} kbps\``, ephemeral: true });
  });
};