const VoiceChannelModel = require("../schemas/voiceChannel");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("vc-notif-toggle-")) return;

    const voiceId = interaction.customId.split("vc-notif-toggle-")[1];
    if (!voiceId) return;

    const data = await VoiceChannelModel.findOne({ channelId: voiceId });
    if (!data) {
      return interaction.reply({ content: `❌ Voice tidak ditemukan di database.`, ephemeral: true });
    }
    
    const isOwner = interaction.user.id === data.ownerId;
    const isTrusted = data.allowedControllers.includes(interaction.user.id);

    if (!isOwner && !isTrusted) {
      return interaction.reply({ content: "Kamu tidak memiliki izin untuk mengganti nama voice ini.", ephemeral: true });
    }

    data.notificationsEnabled = !data.notificationsEnabled;
    await data.save();

    await interaction.reply({
      content: `🔔 Notifikasi join/leave telah ${data.notificationsEnabled ? "**diaktifkan**" : "**dinonaktifkan**"}.`,
      ephemeral: true,
    });
  });
};