const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "say",
  description: "Bot akan mengulangi pesan yang Anda masukkan.",
  category: "utility",
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'staff');
    if (permissionError) {
      return message.reply(permissionError);
    }

    // Meminta pengguna untuk menentukan channel
    const embed1 = new EmbedBuilder()
    .setDescription('Silakan sebutkan channel di mana Anda ingin mengirim pesan (contoh: #general):');
    const promptChannelMessage = await message.channel.send({ embeds: [embed1] });

    // Filter untuk menangkap channel yang disebutkan
    const channelFilter = response => response.author.id === message.author.id && response.mentions.channels.size > 0;

    // Menunggu input pengguna untuk channel
    const collectedChannel = await message.channel.awaitMessages({ filter: channelFilter, max: 1, errors: ['time'] }).catch(async () => {
      await promptChannelMessage.delete();
      return message.channel.send('Waktu habis! Silakan coba lagi.');
    });

    const userChannel = collectedChannel.first().mentions.channels.first();

    // Menghapus pesan channel setelah mendapatkan input
    await collectedChannel.first().delete();
    await promptChannelMessage.delete();

    // Meminta pengguna untuk mengetik pesan yang ingin dikirim
    const embed = new EmbedBuilder()
      .setDescription('Silakan ketik pesan yang ingin kamu kirim (atau ketik "cancel" untuk membatalkan):');
    const promptMessage = await message.channel.send({ embeds: [embed] });

    // Filter untuk menangkap pesan yang dikirim
    const messageFilter = response => response.author.id === message.author.id;

    // Menunggu pesan pengguna
    const collectedMessage = await message.channel.awaitMessages({ filter: messageFilter, max: 1, errors: ['time'] }).catch(async () => {
      await promptMessage.delete();
      return message.channel.send('Waktu habis! Silakan coba lagi.');
    });

    const userMessage = collectedMessage.first();

    // Memeriksa apakah pengguna ingin membatalkan
    if (userMessage.content.toLowerCase() === 'cancel') {
      await userMessage.delete();
      await promptMessage.delete();
      return message.channel.send('Pengisian dibatalkan.');
    }

    // Menghapus pesan pengguna setelah mendapatkan input
    await userMessage.delete();
    await promptMessage.delete();

    // Mengirim pesan yang dimasukkan pengguna ke channel yang ditentukan
    try {
      await userChannel.send(userMessage.content);
      message.channel.send('Berhasil mengirimkan message.');
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
      message.channel.send('Terjadi kesalahan saat mengirim pesan ke channel.');
    }
  }
};