const Responder = require('../../schemas/autoresponder');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'listresponder',
  aliases: ["listres"],
  description: 'List all autoresponders',
  category: 'Autoresponder',
  async exec(client, message) {
    try {
      const responders = await Responder.find();
      if (responders.length === 0) {
        return message.reply('No autoresponders found.');
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Autoresponders List')
        .setDescription('Ini dia list auto responder:')
        .setTimestamp();

      // Ambil maksimal 10 autoresponder
      const respondersToShow = responders.slice(0, 10);

      // Menambahkan fields dengan format "Auto Responder 1-10"
      respondersToShow.forEach((r, index) => {
        const position = index + 1;
        embed.addFields({ name: `Auto Responder ${position}`, value: `Trigger: \`${r.trigger}\`\nResponse: ${r.response}`, inline: false });
      });

      let row;
      if (responders.length > 10) {
        row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('more_responders')
              .setLabel('Lihat yang lainnya.')
              .setStyle(ButtonStyle.Primary),
          );
      }

      // Mengirim embed dan button jika ada
      const replyMessage = await message.reply({ embeds: [embed], components: row ? [row] : [] });

      // Mengatur filter untuk button click
      if (row) {
        const filter = i => {
          i.deferUpdate(); // Menghindari timeout pada button
          return i.customId === 'more_responders' && i.user.id === message.author.id;
        };

        const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 }); // 1 menit

        collector.on('collect', async i => {
          // Tampilkan autoresponder selanjutnya
          const currentCount = respondersToShow.length;
          const nextResponders = responders.slice(currentCount, currentCount + 10);

          if (nextResponders.length === 0) {
            return i.followUp({ content: 'Tidak ditemukan lagi autoresponder.', ephemeral: true });
          }

          const newEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Autoresponders List')
            .setDescription('Berikut adalah set autoresponder berikutnya:')
            .setTimestamp();

          nextResponders.forEach((r, index) => {
            const position = currentCount + index + 1; // Posisi yang benar dalam daftar total
            newEmbed.addFields({ name: `Auto Responder ${position}`, value: `Trigger: \`${r.trigger}\`\nResponse: ${r.response}`, inline: false });
          });

          await i.update({ embeds: [newEmbed], components: [row] });
        });

        collector.on('end', collected => {
          // Menghapus button setelah waktu habis
          row.components[0].setDisabled(true);
          replyMessage.edit({ components: [row] });
        });
      }

    } catch (err) {
      console.error(err);
      message.reply('Failed to list autoresponders.');
    }
  },
};