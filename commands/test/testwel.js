const { PermissionsBitField } = require("discord.js");

module.exports = {
    name: 'testwelcome',
    description: 'Mengirim pesan welcome untuk testing',
    async exec(client, message, args) {
        const rolePermissions = require("../../util/rolePermissions");
        
        // Check permission using standardized system
        const permissionError = rolePermissions.checkPermission(message.member, 'staff');
        if (permissionError) {
            return message.reply(permissionError);
        }
        const guild = message.guild;
        const member = guild.members.cache.get(message.author.id);

        if (!member) {
            return message.reply("Member tidak ditemukan di server.");
        }

        try {
            const eventHandler = require("../../events/guild/guildMemberAdd.js");
            await eventHandler.exec(client, member);

            message.reply("<a:check:1367395457529282581> **|** Welcome message telah dikirim.");
        } catch (err) {
            console.error(err);
            message.reply("<a:important:1367186288297377834> **|** Terjadi kesalahan saat testing welcome.");
        }
    }
};