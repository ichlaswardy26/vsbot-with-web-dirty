module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("vc-rename-modal-")) return;

    const voiceId = interaction.customId.split("vc-rename-modal-")[1];
    const newName = interaction.fields.getTextInputValue("vc-new-name");

    const channel = interaction.guild.channels.cache.get(voiceId);
    if (!channel || channel.type !== 2) return; // Type 2 = Voice

    await channel.setName(newName).catch(() => {});
    await interaction.reply({ content: `✅ Nama voice channel telah diubah menjadi \`${newName}\``, ephemeral: true });
  });
};