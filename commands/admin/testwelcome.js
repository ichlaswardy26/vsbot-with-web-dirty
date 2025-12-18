const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'testwelcome',
    description: 'Test pesan welcome',
    category: 'admin',
    async exec(client, message) {
        const rolePermissions = require("../../util/rolePermissions");
        
        const permissionError = rolePermissions.checkPermission(message.member, 'staff');
        if (permissionError) {
            return message.reply(permissionError);
        }
        
        const guild = message.guild;
        const member = guild.members.cache.get(message.author.id);

        if (!member) {
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors?.error || '#ED4245')
                .setTitle(`${config.emojis?.cross || '❌'} Member Tidak Ditemukan`)
                .setDescription('Member tidak ditemukan di server.')
                .setTimestamp();
            return message.reply({ embeds: [errorEmbed] });
        }

        try {
            const eventHandler = require("../../events/guild/guildMemberAdd.js");
            await eventHandler.exec(client, member);

            const successEmbed = new EmbedBuilder()
                .setColor(config.colors?.success || '#57F287')
                .setTitle(`${config.emojis?.check || '✅'} Test Welcome Berhasil`)
                .setDescription('Pesan welcome telah dikirim ke channel yang dikonfigurasi.')
                .addFields(
                    { name: '👤 Member Test', value: `${message.author}`, inline: true },
                    { name: '🏠 Server', value: guild.name, inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
                .setFooter({ text: `Ditest oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            message.reply({ embeds: [successEmbed] });
        } catch (err) {
            console.error(err);
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors?.error || '#ED4245')
                .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
                .setDescription('Gagal mengirim pesan welcome. Pastikan channel welcome sudah dikonfigurasi.')
                .setTimestamp();
            message.reply({ embeds: [errorEmbed] });
        }
    }
};
