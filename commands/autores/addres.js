const Responder = require('../../schemas/autoresponder');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'addresponder',
  aliases: ["addres"],
  description: 'Add a new autoresponder interactively',
  category: 'Autoresponder',
  async exec(client, message) {
    const filter = response => response.author.id === message.author.id;

    // Step 1: Kirimkan permintaan untuk trigger
    const triggerEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Tambah Autoresponder')
      .setDescription('Kirimkan trigger autoresponder (atau ketik "cancel" untuk membatalkan):');

    await message.reply({ embeds: [triggerEmbed] });

    // Step 2: Buat message collector untuk mendapatkan trigger
    const collector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

    collector.on('collect', async (triggerMessage) => {
      const trigger = triggerMessage.content.toLowerCase(); // Ambil trigger dari pesan pengguna

      // Cek jika pengguna mengetik "cancel"
      if (trigger === 'cancel') {
        const cancelEmbed = new EmbedBuilder()
          .setColor('#ffcc00')
          .setTitle('Pembatalan')
          .setDescription('Proses penambahan autoresponder dibatalkan.')
          .setTimestamp();
        return message.reply({ embeds: [cancelEmbed] });
      }

      // Step 3: Tanyakan untuk response autoresponder
      const responseEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Tambah Autoresponder')
        .setDescription('Kirimkan response autoresponder (atau ketik "cancel" untuk membatalkan):');

      await message.reply({ embeds: [responseEmbed] });

      const responseCollector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

      responseCollector.on('collect', async (responseMessage) => {
        const response = responseMessage.content; // Ambil response dari pesan pengguna

        // Cek jika pengguna mengetik "cancel"
        if (response.toLowerCase() === 'cancel') {
          const cancelEmbed = new EmbedBuilder()
            .setColor('#ffcc00')
            .setTitle('Pembatalan')
            .setDescription('Proses penambahan autoresponder dibatalkan.')
            .setTimestamp();
          return message.reply({ embeds: [cancelEmbed] });
        }

        // Simpan autoresponder baru di database
        try {
          const newResponder = new Responder({ trigger, response });
          await newResponder.save();

          const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Autoresponder Ditambahkan')
            .setDescription(`Autoresponder berhasil ditambahkan:\nTrigger: \`${trigger}\`\nResponse: ${response}`)
            .setTimestamp();

          await message.reply({ embeds: [successEmbed] });
        } catch (err) {
          console.error(err);
          const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Gagal Menambahkan Autoresponder')
            .setDescription('Gagal menambahkan autoresponder. Mungkin sudah ada trigger yang sama.')
            .setTimestamp();

          await message.reply({ embeds: [errorEmbed] });
        }
      });

      // Jika pengguna tidak mengirimkan response dalam 30 detik
      responseCollector.on('end', (collected) => {
        if (collected.size === 0) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#ffcc00')
            .setTitle('Waktu Habis')
            .setDescription('Waktu habis! Autoresponder tidak ditambahkan.')
            .setTimestamp();

          message.reply({ embeds: [timeoutEmbed] });
        }
      });
    });

    // Jika pengguna tidak mengirimkan trigger dalam 30 detik
    collector.on('end', (collected) => {
      if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#ffcc00')
          .setTitle('Waktu Habis')
          .setDescription('Waktu habis! Autoresponder tidak ditambahkan.')
          .setTimestamp();

        message.reply({ embeds: [timeoutEmbed] });
      }
    });
  },
};