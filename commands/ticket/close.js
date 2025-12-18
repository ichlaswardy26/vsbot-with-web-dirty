const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config.js");
const rolePermissions = require("../../util/rolePermissions");

module.exports = {
  name: "close",
  aliases: ["tutup"],
  description: "Menutup tiket",
  category: "ticket",
  usage: "close",
  async exec(client, message) {
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'ticket');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const channel = message.channel;

    // Pastikan command digunakan di channel ticket
    if (!channel.name.startsWith("partner-") && !channel.name.startsWith("ticket-")) {
      return message.reply(`${config.emojis?.warning || "⚠️"} **|** Command ini hanya dapat digunakan di channel tiket!`);
    }

    // Confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle("🔒 Konfirmasi Tutup Tiket")
      .setDescription(`Apakah kamu yakin ingin menutup tiket ini?\n\nTiket akan dihapus dalam **5 detik** setelah konfirmasi.`)
      .setColor(config.colors?.warning || "#FEE75C")
      .setFooter({ text: `Diminta oleh ${message.author.username}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_close_ticket")
        .setLabel("Ya, Tutup Tiket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒"),
      new ButtonBuilder()
        .setCustomId("cancel_close_ticket")
        .setLabel("Batal")
        .setStyle(ButtonStyle.Secondary)
    );

    const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

    const collector = confirmMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 30000,
      max: 1
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === "confirm_close_ticket") {
        const closingEmbed = new EmbedBuilder()
          .setTitle("🔒 Tiket Ditutup")
          .setDescription(`Tiket akan dihapus dalam **5 detik**...`)
          .setColor(config.colors?.error || "#ED4245")
          .addFields(
            { name: "👤 Ditutup oleh", value: `${message.author}`, inline: true },
            { name: "📁 Channel", value: `${channel.name}`, inline: true }
          )
          .setFooter({ text: "Terima kasih telah menghubungi kami!" })
          .setTimestamp();

        await interaction.update({ embeds: [closingEmbed], components: [] });

        // Delay sebelum menghapus channel
        setTimeout(async () => {
          try {
            // Kirim log sebelum channel dihapus
            const logChannelId = config.channels?.ticketLogs;
            const logChannel = logChannelId ? message.guild.channels.cache.get(logChannelId) : null;
            
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle("🗑️ Tiket Ditutup")
                .setColor(config.colors?.error || "#ED4245")
                .addFields(
                  { name: "👤 Ditutup oleh", value: `${message.author.tag} (${message.author.id})`, inline: true },
                  { name: "📁 Channel", value: `${channel.name}`, inline: true },
                  { name: "⏰ Waktu", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: `ID: ${channel.id}` })
                .setTimestamp();

              await logChannel.send({ embeds: [logEmbed] });
            }

            // Hapus channel
            await channel.delete();
          } catch (err) {
            console.error("[close] Error:", err.message);
          }
        }, 5000);
      } else {
        await interaction.update({ 
          content: `${config.emojis?.check || "✅"} **|** Penutupan tiket dibatalkan.`,
          embeds: [], 
          components: [] 
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        confirmMsg.edit({ 
          content: `${config.emojis?.warning || "⚠️"} **|** Waktu habis. Penutupan tiket dibatalkan.`,
          embeds: [], 
          components: [] 
        }).catch(() => {});
      }
    });
  },
};
