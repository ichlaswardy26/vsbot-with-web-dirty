const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');
const FormData = require('form-data');
const config = require('../../config.js');

// API Key dari remove.bg
const REMOVE_BG_API_KEY = config.apiKeys.removeBg;

module.exports = {
  name: 'removebg',
  description: 'Menghapus background dari gambar dan mengkompresnya untuk icon role',
  async exec(client, message) {
    // Step 1: Minta user kirim gambar
    const promptEmbed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('🖼️ Kirim Gambar')
      .setDescription(`${config.emojis.seraphyx} **|** Silakan kirim **gambar PNG/JPG** yang ingin dihapus background-nya.\nKamu punya waktu 30 detik.`)
      .setFooter({ text: 'Command akan dibatalkan jika tidak ada gambar yang dikirim.' });

    await message.reply({ embeds: [promptEmbed] });

    // Step 2: Tunggu attachment dari user
    const filter = (m) => m.author.id === message.author.id && m.attachments.size > 0;
    try {
      const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
      const imageMsg = collected.first();
      const attachment = imageMsg.attachments.first();

      // Validasi tipe file
      if (!attachment.contentType?.startsWith('image/')) {
        return message.reply(`${config.emojis.important} **|** File yang dikirim bukan gambar.`);
      }

      await message.channel.send(`${config.emojis.seraphyx} **|** Memproses gambar, harap tunggu...`);

      // Download gambar
      const imageBuffer = (await axios.get(attachment.url, { responseType: 'arraybuffer' })).data;

      // Validasi API key
      if (!REMOVE_BG_API_KEY) {
        return message.reply(`${config.emojis.important} **|** API key Remove.bg tidak dikonfigurasi. Hubungi administrator.`);
      }

      // Kirim ke remove.bg
      const formData = new FormData();
      formData.append('image_file', imageBuffer, { filename: 'image.png' });
      formData.append('size', 'auto');

      const removeBgResponse = await axios.post(
        'https://api.remove.bg/v1.0/removebg',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'X-Api-Key': REMOVE_BG_API_KEY
          },
          responseType: 'arraybuffer'
        }
      );

      const noBgBuffer = Buffer.from(removeBgResponse.data);

      // Kompres hasil
      const compressedBuffer = await sharp(noBgBuffer)
        .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 }) // Format ideal untuk icon
        .toBuffer();

      const resultAttachment = new AttachmentBuilder(compressedBuffer, { name: 'icon.webp' });

      // Kirim hasil ke user
      await message.reply({
        content: '✅ **|** Background berhasil dihapus dan gambar telah dikompres!',
        files: [resultAttachment]
      });

    } catch (error) {
      if (error instanceof Map) {
        return message.reply(`${config.emojis.seraphyx} **|** Waktu habis. Tidak ada gambar yang dikirim.`);
      }

      console.error('❌ Error:', error?.response?.data || error);
      return message.reply(`${config.emojis.important} **|** Terjadi kesalahan saat memproses gambar. Coba lagi nanti.`);
    }
  }
};