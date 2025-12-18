const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "say",
  description: "Make bot send a message to specified channel",
  category: "utility",
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'staff');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const embed1 = new EmbedBuilder()
      .setDescription('Silakan sebutkan channel di mana Anda ingin mengirim pesan (contoh: #general):');
    const promptChannelMessage = await message.channel.send({ embeds: [embed1] });

    const channelFilter = response => response.author.id === message.author.id && response.mentions.channels.size > 0;

    const collectedChannel = await message.channel.awaitMessages({ filter: channelFilter, max: 1, time: 60000 }).catch(async () => {
      await promptChannelMessage.delete();
      return message.channel.send('Waktu habis! Silakan coba lagi.');
    });

    if (!collectedChannel.first()) return;

    const userChannel = collectedChannel.first().mentions.channels.first();

    await collectedChannel.first().delete();
    await promptChannelMessage.delete();

    const embed = new EmbedBuilder()
      .setDescription('Silakan ketik pesan yang ingin kamu kirim (atau ketik "cancel" untuk membatalkan):');
    const promptMessage = await message.channel.send({ embeds: [embed] });

    const messageFilter = response => response.author.id === message.author.id;

    const collectedMessage = await message.channel.awaitMessages({ filter: messageFilter, max: 1, time: 60000 }).catch(async () => {
      await promptMessage.delete();
      return message.channel.send('Waktu habis! Silakan coba lagi.');
    });

    if (!collectedMessage.first()) return;

    const userMessage = collectedMessage.first();

    if (userMessage.content.toLowerCase() === 'cancel') {
      await userMessage.delete();
      await promptMessage.delete();
      return message.channel.send('Pengisian dibatalkan.');
    }

    await userMessage.delete();
    await promptMessage.delete();

    try {
      await userChannel.send(userMessage.content);
      message.channel.send('Berhasil mengirimkan message.');
    } catch (err) {
      console.error("Failed to send message:", err);
      message.channel.send('Terjadi kesalahan saat mengirim pesan ke channel.');
    }
  }
};
