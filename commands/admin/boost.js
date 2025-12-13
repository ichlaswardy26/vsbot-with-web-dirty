
const Boost = require('../../schemas/Boost');

module.exports = {
  name: 'boost',
  description: 'Aktifkan XP Boost untuk server ini',
  usage: '<jam> <x1/x2/x3/...>',
  async exec(client, message, args) {
    try {
      const rolePermissions = require("../../util/rolePermissions");
      
      // Check permission using standardized system
      const permissionError = rolePermissions.checkPermission(message.member, 'admin');
      if (permissionError) {
        return message.reply(permissionError);
      }

      // Parsing argumen
      const hours = parseInt(args[0]);
      const multiplierArg = args[1];

      if (isNaN(hours) || hours <= 0 || !multiplierArg) {
        return message.reply('❌ **|** Format: `..boost <jam> <x1/x2/x3/...>`\nContoh: `..boost 2 x3`');
      }

      // Parsing multiplier (hapus huruf x)
      const multiplier = parseInt(multiplierArg.replace('x', ''));
      if (isNaN(multiplier) || multiplier < 1) {
        return message.reply('❌ **|** Multiplier harus dalam format x1, x2, x3, dst.');
      }

      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

      // Simpan / update boost ke DB
      const boost = await Boost.findOneAndUpdate(
        { guildId: message.guild.id },
        { multiplier, expiresAt },
        { upsert: true, new: true }
      );

      return message.channel.send(
        `✨ **|** XP Boost berhasil diaktifkan!\nMultiplier: **x${boost.multiplier}**\nDurasi: **${hours} jam**\nAkan berakhir pada: <t:${Math.floor(
          boost.expiresAt.getTime() / 1000
        )}:F>`
      );
    } catch (err) {
      console.error('Error in boost command:', err);
      return message.reply('❌ Terjadi kesalahan saat mengaktifkan boost!');
    }
  }
};
