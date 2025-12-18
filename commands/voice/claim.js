const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "claim",
  description: "Klaim kepemilikan voice channel jika owner sudah keluar",
  category: "voice",
  aliases: [],
  async exec(client, message) {
    const member = message.member;
    const voice = member.voice.channel;
    
    if (!voice) {
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Tidak di Voice Channel`)
        .setDescription('Kamu harus berada di voice channel untuk menggunakan perintah ini.')
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }

    const VoiceChannelModel = require("../../schemas/voiceChannel");
    const data = await VoiceChannelModel.findOne({ channelId: voice.id });
    
    if (!data) {
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Bukan Custom Voice`)
        .setDescription('Channel ini bukan custom voice channel.')
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }

    const ownerStillHere = voice.members.some(m => m.id === data.ownerId);
    if (ownerStillHere) {
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.warning || '#FEE75C')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Owner Masih Ada`)
        .setDescription('Owner asli masih berada di voice channel. Kamu tidak bisa mengklaim channel ini.')
        .setTimestamp();
      return message.reply({ embeds: [errorEmbed] });
    }

    data.ownerId = member.id;
    await data.save();

    const newName = `${member.displayName}'s VC`;
    await voice.setName(newName);

    const successEmbed = new EmbedBuilder()
      .setColor(config.colors?.success || '#57F287')
      .setTitle(`${config.emojis?.check || '✅'} Voice Channel Diklaim`)
      .setDescription(`Kamu sekarang menjadi owner dari voice channel ini.`)
      .addFields(
        { name: '🎙️ Nama Channel', value: `**${newName}**`, inline: true },
        { name: '👤 Owner Baru', value: `${member}`, inline: true }
      )
      .setFooter({ text: `Diklaim oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    message.reply({ embeds: [successEmbed] });
  },
};
