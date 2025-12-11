const config = require("../../config.js");

module.exports = {
  name: "claim",
  aliases: [],
  async exec(client, message, args) {
    const member = message.member;
    const voice = member.voice.channel;
    if (!voice) return message.reply("<a:important:1367186288297377834> **|** Kamu tidak sedang berada di voice channel.");

    const VoiceChannelModel = require("../../schemas/voiceChannel");
    const data = await VoiceChannelModel.findOne({ channelId: voice.id });
    if (!data) return message.reply("<a:important:1367186288297377834> **|** Channel ini bukan custom voice.");

    // Cek apakah owner masih berada di voice channel
    const ownerStillHere = voice.members.some(m => m.id === data.ownerId);
    if (ownerStillHere) return message.reply("<a:important:1367186288297377834> **|** Owner asli masih berada di channel.");

    // Ambil alih
    data.ownerId = member.id;
    await data.save();

    // Ganti nama channel
    const newName = `${member.displayName}'s VC`;
    await voice.setName(newName);

    // Notifikasi
    message.reply(`${config.emojis.seraphyx} **|** Voice berhasil diclaim.\n${config.emojis.blank} **|** Nama channel diubah menjadi **${newName}**.`);
  },
};
