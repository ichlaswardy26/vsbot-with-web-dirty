const UserBalance = require("../../schemas/UserBalance");

module.exports = {
  name: "add",
  aliases: ["addbalance"],
  description: "Tambah saldo ke user",
  async exec(client, message, args) {
    const rolePermissions = require("../../util/rolePermissions");
    
    // Check permission using standardized system
    const permissionError = rolePermissions.checkPermission(message.member, 'shop');
    if (permissionError) {
      return message.reply(permissionError);
    }

    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!user || isNaN(amount)) {
      return message.reply("⚠️ Gunakan: `..add <@user> <jumlah>`");
    }

    let userData =
      (await UserBalance.findOne({ guildId: message.guild.id, userId: user.id })) ||
      new UserBalance({ guildId: message.guild.id, userId: user.id, cash: 0 });

    userData.cash += amount;
    await userData.save();

    message.reply(`✅ Berhasil menambahkan 💰 ${amount} ke saldo ${user.username}.  
Sekarang dia punya total 💰 ${userData.cash}`);
  },
};
