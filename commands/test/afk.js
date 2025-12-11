global.afkUsers = global.afkUsers || new Map();

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'afk',
    description: 'Mengatur status Anda sebagai Away From Keyboard (AFK).',
    args: false,
    usage: '[alasan]',
    async exec(client, message, args) {
        const userId = message.author.id;
        const username = message.author.username;
        const member = message.member;

        // Cek apakah user sudah AFK
        if (global.afkUsers.has(userId)) {
            const currentAfk = global.afkUsers.get(userId);
            const embed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('⚠️ Anda Sudah AFK')
                .setDescription(`Anda sudah dalam status AFK sejak <t:${Math.floor(currentAfk.timestamp / 1000)}:R>`)
                .addFields(
                    { name: '📝 Alasan', value: currentAfk.reason, inline: false }
                )
                .setFooter({ text: 'Kirim pesan apapun untuk membatalkan AFK' })
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }

        const reason = args.join(' ') || 'Tidak ada alasan';
        let originalNickname = member.nickname; // Simpan nickname asli
        const afkStartTime = Date.now(); // Ambil waktu saat ini

        // Coba ubah nickname user
        let nicknameChanged = false;
        try {
            // Pastikan bot memiliki izin untuk mengubah nickname
            if (member.manageable) {
                // Tambahkan prefix [AFK] ke nickname
                const currentName = originalNickname || username;
                const newNickname = `[AFK] ${currentName}`.substring(0, 32); // Discord limit 32 chars
                
                // Cek apakah nickname sudah ada [AFK] prefix
                if (!currentName.startsWith('[AFK]')) {
                    await member.setNickname(newNickname);
                    nicknameChanged = true;
                }
            } else {
                console.log('Bot tidak memiliki izin untuk mengubah nickname user ini');
                originalNickname = null; // Set null jika tidak bisa mengubah nickname
            }
        } catch (error) {
            console.error('Gagal mengubah nickname:', error);
            originalNickname = null; // Set null jika terjadi error
        }

        // Simpan status AFK user
        global.afkUsers.set(userId, {
            reason: reason,
            timestamp: afkStartTime,
            originalNickname: originalNickname // Simpan nickname asli
        });

        // Kirim embed konfirmasi
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('💤 Status AFK Diaktifkan')
            .setDescription(`${message.author} sekarang sedang AFK`)
            .addFields(
                { name: '📝 Alasan', value: reason, inline: false },
                { name: '⏰ Waktu', value: `<t:${Math.floor(afkStartTime / 1000)}:F>`, inline: false },
                { name: '🏷️ Nickname', value: nicknameChanged ? '✅ Diubah ke [AFK]' : '❌ Tidak dapat diubah', inline: false }
            )
            .setFooter({ text: 'Kirim pesan apapun untuk membatalkan AFK' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },
};
