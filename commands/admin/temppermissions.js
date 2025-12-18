const { EmbedBuilder } = require('discord.js');
const rolePermissions = require('../../util/rolePermissions');
const logger = require('../../util/logger');

module.exports = {
    name: 'temppermissions',
    aliases: ['tempperm', 'tp'],
    description: 'Manage temporary permissions for users',
    usage: 'temppermissions <grant|revoke|extend|list|check> [options]',
    category: 'admin',
    
    async exec(client, message, args) {
        try {
            // Check admin permission
            const permissionError = rolePermissions.checkPermission(message.member, 'admin');
            if (permissionError) {
                return message.reply(permissionError);
            }

            const subcommand = args[0]?.toLowerCase();
            
            switch (subcommand) {
                case 'grant':
                    await this.handleGrant(message, args.slice(1), client);
                    break;
                case 'revoke':
                    await this.handleRevoke(message, args.slice(1), client);
                    break;
                case 'extend':
                    await this.handleExtend(message, args.slice(1), client);
                    break;
                case 'list':
                    await this.handleList(message, args.slice(1), client);
                    break;
                case 'check':
                    await this.handleCheck(message, args.slice(1), client);
                    break;
                default: {
                    const config = require('../../config');
                    const helpEmbed = new EmbedBuilder()
                        .setColor(config.colors?.primary || '#5865F2')
                        .setTitle('📋 Bantuan Permission Sementara')
                        .setDescription('Kelola permission sementara untuk pengguna')
                        .setThumbnail(message.guild.iconURL({ dynamic: true }))
                        .addFields(
                            { name: 'Berikan Permission', value: '`temppermissions grant <user> <permission> <durasi> [alasan]`', inline: false },
                            { name: 'Cabut Permission', value: '`temppermissions revoke <user> [permission] [alasan]`', inline: false },
                            { name: 'Perpanjang Permission', value: '`temppermissions extend <user> <durasi> [alasan]`', inline: false },
                            { name: 'Daftar Permission', value: '`temppermissions list [user]`', inline: false },
                            { name: 'Cek Permission', value: '`temppermissions check <user>`', inline: false }
                        )
                        .addFields(
                            { name: 'Permission Valid', value: 'admin, staff, moderator, economy, giveaway, ticket, shop', inline: false },
                            { name: 'Format Durasi', value: '1s, 30m, 2h, 7d (maks: 7 hari)', inline: false }
                        )
                        .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [helpEmbed] });
                }
            }

        } catch (error) {
            await logger.logError(error, 'executing temppermissions command');
            message.reply('❌ **|** Terjadi error saat menjalankan command.');
        }
    },

    async handleGrant(message, args, client) {
        const config = require('../../config');
        if (args.length < 3) {
            return message.reply('❌ **|** Penggunaan: `temppermissions grant <user> <permission> <durasi> [alasan]`');
        }

        const userMention = args[0];
        const permission = args[1].toLowerCase();
        const duration = args[2];
        const reason = args.slice(3).join(' ') || 'Tidak ada alasan';

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** Pengguna tidak ditemukan.');
        }

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return message.reply('❌ **|** Pengguna tidak ditemukan di server ini.');
        }

        // Grant temporary permission
        const result = await rolePermissions.grantTemporaryPermission(
            user.id,
            message.guild.id,
            permission,
            duration,
            message.author.id,
            reason
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal memberikan permission sementara: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.success || '#57F287')
            .setTitle('✅ Permission Sementara Diberikan')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Pengguna', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Permission', value: result.permissions.join(', '), inline: true },
                { name: 'Durasi', value: result.durationFormatted, inline: true },
                { name: 'Berakhir', value: `<t:${Math.floor(result.expiry / 1000)}:R>`, inline: true },
                { name: 'Diberikan Oleh', value: message.author.tag, inline: true },
                { name: 'Alasan', value: reason, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleRevoke(message, args, client) {
        const config = require('../../config');
        if (args.length < 1) {
            return message.reply('❌ **|** Penggunaan: `temppermissions revoke <user> [permission] [alasan]`');
        }

        const userMention = args[0];
        const permission = args[1]?.toLowerCase() || null;
        const reason = args.slice(permission ? 2 : 1).join(' ') || 'Tidak ada alasan';

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** Pengguna tidak ditemukan.');
        }

        // Revoke temporary permission
        const result = await rolePermissions.revokeTemporaryPermission(
            user.id,
            message.guild.id,
            permission,
            message.author.id,
            reason
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal mencabut permission sementara: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.warning || '#FEE75C')
            .setTitle('🔄 Permission Sementara Dicabut')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Pengguna', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Permission Dicabut', value: result.revokedPermissions.join(', ') || 'Semua', inline: true },
                { name: 'Permission Tersisa', value: result.remainingPermissions.join(', ') || 'Tidak ada', inline: true },
                { name: 'Dicabut Oleh', value: message.author.tag, inline: true },
                { name: 'Alasan', value: reason, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleExtend(message, args, client) {
        const config = require('../../config');
        if (args.length < 2) {
            return message.reply('❌ **|** Penggunaan: `temppermissions extend <user> <durasi> [alasan]`');
        }

        const userMention = args[0];
        const additionalDuration = args[1];
        const reason = args.slice(2).join(' ') || 'Tidak ada alasan';

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** Pengguna tidak ditemukan.');
        }

        // Extend temporary permission
        const result = await rolePermissions.extendTemporaryPermission(
            user.id,
            message.guild.id,
            additionalDuration,
            message.author.id,
            reason
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal memperpanjang permission sementara: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle('⏰ Permission Sementara Diperpanjang')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Pengguna', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Durasi Tambahan', value: result.additionalDurationFormatted, inline: true },
                { name: 'Berakhir Baru', value: `<t:${Math.floor(result.newExpiry / 1000)}:R>`, inline: true },
                { name: 'Diperpanjang Oleh', value: message.author.tag, inline: true },
                { name: 'Alasan', value: reason, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleList(message, args, client) {
        const config = require('../../config');
        const userMention = args[0];
        let user = null;

        if (userMention) {
            const userId = userMention.replace(/[<@!>]/g, '');
            user = await client.users.fetch(userId).catch(() => null);
        }

        const permissions = user ? 
            rolePermissions.getAllTemporaryPermissions(message.guild.id).filter(p => p.userId === user.id) :
            rolePermissions.getAllTemporaryPermissions(message.guild.id);

        if (permissions.length === 0) {
            const message_text = user ? 
                `❌ **|** ${user} tidak memiliki permission sementara yang aktif.` :
                '❌ **|** Tidak ada permission sementara yang aktif di server ini.';
            return message.reply(message_text);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle(`📋 Permission Sementara Aktif${user ? ` - ${user.tag}` : ''}`)
            .setDescription(`Total: ${permissions.length} permission aktif`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        for (const perm of permissions.slice(0, 10)) { // Limit to 10 entries
            const permUser = await client.users.fetch(perm.userId).catch(() => null);
            const userName = permUser ? permUser.tag : `Pengguna Tidak Dikenal (${perm.userId})`;
            
            embed.addFields({
                name: `👤 ${userName}`,
                value: `**Permission:** ${perm.permissions.join(', ')}\n**Berakhir:** <t:${Math.floor(perm.expiry / 1000)}:R>\n**Sisa Waktu:** ${perm.timeRemainingFormatted}`,
                inline: true
            });
        }

        if (permissions.length > 10) {
            embed.setFooter({ text: `Menampilkan 10 dari ${permissions.length} permission` });
        } else {
            embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        }

        message.reply({ embeds: [embed] });
    },

    async handleCheck(message, args, client) {
        const config = require('../../config');
        if (args.length < 1) {
            return message.reply('❌ **|** Penggunaan: `temppermissions check <user>`');
        }

        const userMention = args[0];
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** Pengguna tidak ditemukan.');
        }

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return message.reply('❌ **|** Pengguna tidak ditemukan di server ini.');
        }

        // Get complete user permissions
        const completePermissions = await rolePermissions.getCompleteUserPermissions(member);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle(`🔍 Analisis Permission Lengkap - ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        // Direct permissions
        const directPerms = Object.entries(completePermissions.directPermissions)
            .filter(([, hasPermission]) => hasPermission)
            .map(([permission]) => permission);
        
        embed.addFields({
            name: '🎯 Permission Langsung',
            value: directPerms.length > 0 ? directPerms.join(', ') : 'Tidak ada',
            inline: false
        });

        // Temporary permissions
        if (completePermissions.temporaryPermissions) {
            const tempPerms = completePermissions.temporaryPermissions;
            embed.addFields({
                name: '⏰ Permission Sementara',
                value: `**Permission:** ${tempPerms.permissions.join(', ')}\n**Berakhir:** <t:${Math.floor(tempPerms.expiry / 1000)}:R>\n**Sisa Waktu:** ${tempPerms.timeRemainingFormatted}`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '⏰ Permission Sementara',
                value: 'Tidak ada',
                inline: false
            });
        }

        // Inherited permissions
        if (completePermissions.inheritedPermissions.length > 0) {
            embed.addFields({
                name: '🔗 Permission Diwarisi',
                value: completePermissions.inheritedPermissions.join(', '),
                inline: false
            });
        } else {
            embed.addFields({
                name: '🔗 Permission Diwarisi',
                value: 'Tidak ada',
                inline: false
            });
        }

        // User groups
        if (completePermissions.userGroups.length > 0) {
            embed.addFields({
                name: '👥 Grup Pengguna',
                value: completePermissions.userGroups.join(', '),
                inline: false
            });
        }

        // Role groups
        if (completePermissions.roleGroups.length > 0) {
            const roleGroupsText = completePermissions.roleGroups
                .map(rg => `**${rg.roleName}:** ${rg.groups.join(', ')}`)
                .join('\n');
            embed.addFields({
                name: '🎭 Grup Role',
                value: roleGroupsText,
                inline: false
            });
        }

        // All effective permissions
        embed.addFields({
            name: '✅ Semua Permission Efektif',
            value: completePermissions.allPermissions.length > 0 ? completePermissions.allPermissions.join(', ') : 'Tidak ada',
            inline: false
        });

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        message.reply({ embeds: [embed] });
    }
};