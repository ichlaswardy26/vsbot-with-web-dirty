const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

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

    if (!collectedText) return message.channel.send("<:seraphyx:1367175101711388783> **|** Waktu habis. Coba lagi nanti.");
    const eventText = collectedText.first().content;

    // 2. Minta input channel tujuan
    await message.channel.send("Silakan mention channel tujuan untuk dikirimkan embed (contoh: #audience-chat):");

    const collectedChannel = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 60_000,
      errors: ['time']
    }).catch(() => null);

    if (!collectedChannel) return message.channel.send("<:seraphyx:1367175101711388783> **|** Waktu habis. Coba lagi nanti.");

    const channelMention = collectedChannel.first().mentions.channels.first();
    if (!channelMention || channelMention.type !== ChannelType.GuildText) {
      return message.channel.send("<a:important:1367186288297377834> **|** Channel tidak valid. Pastikan kamu mention channel text.");
    }

    // 3. Buat button dan embed
    const link = new ButtonBuilder()
      .setLabel('Instagram')
      .setURL('https://instagram.com/vseraphyx')
      .setEmoji('<a:PaimonPrimogems:1325098046190784532>')
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(link);

    const embed = new EmbedBuilder()
      .setDescription(eventText)
      .setImage('https://cdn.discordapp.com/attachments/1365958698521989191/1367197836751667290/standard_6.gif?ex=6813b5b5&is=68126435&hm=af1fc383356271e86fb441f9034937105865bcb4de591a722b365f9b3eb93f5e&')
      .setFooter({ text: '© 2025 Villain Seraphyx.' })
      .setColor('White');

    // 4. Kirim embed ke channel tujuan
    await channelMention.send({ embeds: [embed], components: [row] });
    await message.channel.send("<:seraphyx:1367175101711388783> **|** Event berhasil dikirim.");
  }
};
