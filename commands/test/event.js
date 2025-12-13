const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: "event",
  async exec(client, message) {
    // Hapus pesan awal
    await message.delete();

    const filter = m => m.author.id === message.author.id;

    // 1. Minta input teks event
    await message.channel.send(`${message.author}, silakan paste text event:`);

    const collectedText = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 60_000,
      errors: ['time']
    }).catch(() => null);

    if (!collectedText) return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis. Coba lagi nanti.`);
    const eventText = collectedText.first().content;

    // 2. Minta input channel tujuan
    await message.channel.send("Silakan mention channel tujuan untuk dikirimkan embed (contoh: #audience-chat):");

    const collectedChannel = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 60_000,
      errors: ['time']
    }).catch(() => null);

    if (!collectedChannel) return message.channel.send(`${config.emojis.seraphyx} **|** Waktu habis. Coba lagi nanti.`);

    const channelMention = collectedChannel.first().mentions.channels.first();
    if (!channelMention || channelMention.type !== ChannelType.GuildText) {
      return message.channel.send(`${config.emojis.important} **|** Channel tidak valid. Pastikan kamu mention channel text.`);
    }

    // 3. Buat button dan embed
    const link = new ButtonBuilder()
      .setLabel('Instagram')
      .setURL('https://instagram.com/vseraphyx')
      .setEmoji('${config.emojis.paimonPrimogems}')
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(link);

    const embed = new EmbedBuilder()
      .setDescription(eventText)
      .setImage(config.images.event)
      .setFooter({ text: '© 2025 Villain Seraphyx.' })
      .setColor('White');

    // 4. Kirim embed ke channel tujuan
    await channelMention.send({ embeds: [embed], components: [row] });
    await message.channel.send(`${config.emojis.seraphyx} **|** Event berhasil dikirim.`);
  }
};
