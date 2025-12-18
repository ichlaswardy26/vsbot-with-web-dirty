const { EmbedBuilder, ChannelType } = require('discord.js');
const rolePermissions = require('../../util/rolePermissions');
const contextPermissions = require('../../util/contextPermissions');
const logger = require('../../util/logger');

module.exports = {
    name: 'contextperms',
    aliases: ['contextperm', 'cp'],
    description: 'Manage context-based permissions for channels and categories',
    usage: 'contextperms <set|get|remove|user-override|role-perms|check|list|template> [options]',
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
                case 'set':
                    await this.handleSet(message, args.slice(1), client);
                    break;
                case 'get':
                    await this.handleGet(message, args.slice(1), client);
                    break;
                case 'remove':
                    await this.handleRemove(message, args.slice(1), client);
                    break;
                case 'user-override':
                    await this.handleUserOverride(message, args.slice(1), client);
                    break;
                case 'role-perms':
                    await this.handleRolePerms(message, args.slice(1), client);
                    break;
                case 'check':
                    await this.handleCheck(message, args.slice(1), client);
                    break;
                case 'list':
                    await this.handleList(message, args.slice(1), client);
                    break;
                case 'template':
                    await this.handleTemplate(message, args.slice(1), client);
                    break;
                default: {
                    const config = require('../../config');
                    const helpEmbed = new EmbedBuilder()
                        .setColor(config.colors?.primary || '#5865F2')
                        .setTitle('📋 Bantuan Context Permission')
                        .setDescription('Kelola permission berbasis konteks untuk channel dan kategori')
                        .setThumbnail(message.guild.iconURL({ dynamic: true }))
                        .addFields(
                            { name: 'Atur Permission', value: '`contextperms set <channel> <permissions_json>`', inline: false },
                            { name: 'Lihat Permission', value: '`contextperms get <channel>`', inline: false },
                            { name: 'Hapus Permission', value: '`contextperms remove <channel>`', inline: false },
                            { name: 'Override Pengguna', value: '`contextperms user-override <user> <channel> <permissions> <durasi>`', inline: false },
                            { name: 'Permission Role', value: '`contextperms role-perms <role> <channel> <permissions>`', inline: false },
                            { name: 'Cek Pengguna', value: '`contextperms check <user> <channel> <permission>`', inline: false },
                            { name: 'Lihat Semua', value: '`contextperms list`', inline: false },
                            { name: 'Tampilkan Template', value: '`contextperms template`', inline: false }
                        )
                        .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [helpEmbed] });
                }
            }

        } catch (error) {
            await logger.logError(error, 'executing contextperms command');
            message.reply('❌ **|** Terjadi error saat menjalankan command.');
        }
    },

    async handleSet(message, args) {
        const config = require('../../config');
        if (args.length < 2) {
            return message.reply('❌ **|** Penggunaan: `contextperms set <channel> <permissions_json>`\n**Contoh:** `contextperms set #general {"admin":{"allowed":true},"staff":{"allowed":true,"hours":[9,17]}}`');
        }

        const channelMention = args[0];
        const permissionsJson = args.slice(1).join(' ');

        // Parse channel
        const channelId = channelMention.replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            return message.reply('❌ **|** Channel tidak ditemukan.');
        }

        // Parse permissions JSON
        let permissions;
        try {
            permissions = JSON.parse(permissionsJson);
        } catch (error) { // eslint-disable-line no-unused-vars
            return message.reply('❌ **|** Format JSON tidak valid. Gunakan `contextperms template` untuk melihat contoh.');
        }

        // Determine context type
        const contextType = channel.type === ChannelType.GuildCategory ? 'category' : 'channel';

        // Set context permissions
        const result = await contextPermissions.setContextPermissions(
            channel.id,
            contextType,
            permissions,
            message.author.id,
            'Diatur via command contextperms'
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal mengatur context permission: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.success || '#57F287')
            .setTitle('✅ Context Permission Diatur')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Channel/Kategori', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Tipe', value: contextType, inline: true },
                { name: 'Permission', value: '```json\n' + JSON.stringify(permissions, null, 2) + '\n```', inline: false },
                { name: 'Diatur Oleh', value: message.author.tag, inline: true }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleGet(message, args) {
        const config = require('../../config');
        if (args.length < 1) {
            return message.reply('❌ **|** Penggunaan: `contextperms get <channel>`');
        }

        const channelMention = args[0];
        const channelId = channelMention.replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            return message.reply('❌ **|** Channel tidak ditemukan.');
        }

        const permissions = contextPermissions.getContextPermissions(channel.id);
        if (!permissions) {
            return message.reply('❌ **|** Tidak ada context permission yang ditemukan untuk channel ini.');
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle('📋 Context Permission')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Channel/Kategori', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Tipe', value: permissions.contextType, inline: true },
                { name: 'Diatur Oleh', value: `<@${permissions.setBy}>`, inline: true },
                { name: 'Diatur Pada', value: `<t:${Math.floor(permissions.setAt / 1000)}:F>`, inline: true },
                { name: 'Permission', value: '```json\n' + JSON.stringify(permissions.permissions, null, 2) + '\n```', inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        if (permissions.reason) {
            embed.addFields({ name: 'Alasan', value: permissions.reason, inline: false });
        }

        message.reply({ embeds: [embed] });
    },

    async handleRemove(message, args) {
        const config = require('../../config');
        if (args.length < 1) {
            return message.reply('❌ **|** Penggunaan: `contextperms remove <channel>`');
        }

        const channelMention = args[0];
        const channelId = channelMention.replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            return message.reply('❌ **|** Channel tidak ditemukan.');
        }

        const result = await contextPermissions.removeContextPermissions(
            channel.id,
            message.author.id,
            'Dihapus via command contextperms'
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal menghapus context permission: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.warning || '#FEE75C')
            .setTitle('🗑️ Context Permission Dihapus')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Channel/Kategori', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Dihapus Oleh', value: message.author.tag, inline: true }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleUserOverride(message, args, client) {
        const config = require('../../config');
        if (args.length < 4) {
            return message.reply('❌ **|** Penggunaan: `contextperms user-override <user> <channel> <permissions> <durasi>`\n**Contoh:** `contextperms user-override @user #general admin,staff 2h`');
        }

        const userMention = args[0];
        const channelMention = args[1];
        const permissionsStr = args[2];
        const duration = args[3];

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** Pengguna tidak ditemukan.');
        }

        // Parse channel
        const channelId = channelMention.replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            return message.reply('❌ **|** Channel tidak ditemukan.');
        }

        // Parse permissions
        const permissions = permissionsStr.split(',').map(p => p.trim());

        const result = await contextPermissions.setUserOverride(
            user.id,
            channel.id,
            permissions,
            duration,
            message.author.id,
            'Diatur via command contextperms'
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal mengatur override pengguna: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.success || '#57F287')
            .setTitle('✅ Override Pengguna Diatur')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Pengguna', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Channel', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Permission', value: permissions.join(', '), inline: true },
                { name: 'Durasi', value: result.durationFormatted, inline: true },
                { name: 'Berakhir', value: `<t:${Math.floor(result.expiry / 1000)}:R>`, inline: true },
                { name: 'Diatur Oleh', value: message.author.tag, inline: true }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleRolePerms(message, args) {
        const config = require('../../config');
        if (args.length < 3) {
            return message.reply('❌ **|** Penggunaan: `contextperms role-perms <role> <channel> <permissions>`\n**Contoh:** `contextperms role-perms @Moderator #general admin,staff`');
        }

        const roleMention = args[0];
        const channelMention = args[1];
        const permissionsStr = args[2];

        // Parse role
        const roleId = roleMention.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return message.reply('❌ **|** Role tidak ditemukan.');
        }

        // Parse channel
        const channelId = channelMention.replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            return message.reply('❌ **|** Channel tidak ditemukan.');
        }

        // Parse permissions
        const permissions = permissionsStr.split(',').map(p => p.trim());

        const result = await contextPermissions.setRoleContextPermissions(
            role.id,
            channel.id,
            permissions,
            message.author.id,
            'Diatur via command contextperms'
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal mengatur permission role: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.success || '#57F287')
            .setTitle('✅ Context Permission Role Diatur')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Role', value: `${role.name} (${role.id})`, inline: true },
                { name: 'Channel', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Permission', value: permissions.join(', '), inline: true },
                { name: 'Diatur Oleh', value: message.author.tag, inline: true }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleCheck(message, args, client) {
        const config = require('../../config');
        if (args.length < 3) {
            return message.reply('❌ **|** Penggunaan: `contextperms check <user> <channel> <permission>`');
        }

        const userMention = args[0];
        const channelMention = args[1];
        const permission = args[2];

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

        // Parse channel
        const channelId = channelMention.replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            return message.reply('❌ **|** Channel tidak ditemukan.');
        }

        const hasPermission = contextPermissions.hasContextPermission(member, channel.id, permission);
        const analysis = contextPermissions.analyzeUserPermissions(member, channel.id);

        const embed = new EmbedBuilder()
            .setColor(hasPermission ? (config.colors?.success || '#57F287') : (config.colors?.error || '#ED4245'))
            .setTitle(`${hasPermission ? '✅' : '❌'} Pengecekan Context Permission`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Pengguna', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Channel', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Permission', value: permission, inline: true },
                { name: 'Hasil', value: hasPermission ? 'DIIZINKAN' : 'DITOLAK', inline: true }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        if (analysis.contextPermissions) {
            embed.addFields({
                name: 'Context Permission',
                value: '```json\n' + JSON.stringify(analysis.contextPermissions, null, 2) + '\n```',
                inline: false
            });
        }

        if (analysis.userOverride) {
            embed.addFields({
                name: 'Override Pengguna',
                value: `**Permission:** ${analysis.userOverride.permissions.join(', ')}\n**Berakhir:** <t:${Math.floor(analysis.userOverride.expiry / 1000)}:R>`,
                inline: false
            });
        }

        if (analysis.rolePermissions.length > 0) {
            const rolePermsText = analysis.rolePermissions
                .map(rp => `**${rp.roleName}:** ${rp.permissions.join(', ')}`)
                .join('\n');
            embed.addFields({
                name: 'Permission Role',
                value: rolePermsText,
                inline: false
            });
        }

        message.reply({ embeds: [embed] });
    },

    async handleList(message) {
        const config = require('../../config');
        const allPermissions = contextPermissions.getGuildContextPermissions(message.guild.id);

        if (allPermissions.length === 0) {
            return message.reply('❌ **|** Tidak ada context permission yang ditemukan di server ini.');
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle('📋 Semua Context Permission')
            .setDescription(`Total: ${allPermissions.length} context permission`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        for (const perm of allPermissions.slice(0, 10)) { // Limit to 10 entries
            const channel = message.guild.channels.cache.get(perm.contextId);
            const channelName = channel ? channel.name : `Tidak Dikenal (${perm.contextId})`;
            
            embed.addFields({
                name: `${perm.contextType === 'category' ? '📁' : '#'} ${channelName}`,
                value: `**Tipe:** ${perm.contextType}\n**Diatur Oleh:** <@${perm.setBy}>\n**Diatur Pada:** <t:${Math.floor(perm.setAt / 1000)}:R>\n**Permission:** ${Object.keys(perm.permissions).join(', ')}`,
                inline: true
            });
        }

        if (allPermissions.length > 10) {
            embed.setFooter({ text: `Menampilkan 10 dari ${allPermissions.length} context permission` });
        } else {
            embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        }

        message.reply({ embeds: [embed] });
    },

    async handleTemplate(message) {
        const config = require('../../config');
        const templates = {
            basic: {
                "admin": { "allowed": true },
                "staff": { "allowed": true },
                "moderator": { "allowed": true }
            },
            timeRestricted: {
                "admin": { "allowed": true },
                "staff": { 
                    "allowed": true, 
                    "hours": [9, 17],
                    "days": [1, 2, 3, 4, 5]
                },
                "moderator": { 
                    "allowed": true,
                    "hours": [10, 22]
                }
            },
            roleSpecific: {
                "admin": { "allowed": true },
                "staff": { "allowed": true },
                "economy": { "allowed": false },
                "giveaway": { 
                    "allowed": true,
                    "roles": ["event-organizer", "staff"]
                }
            }
        };

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle('📋 Template Context Permission')
            .setDescription('Salin dan modifikasi template ini sesuai kebutuhan')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: '🔹 Template Dasar',
                    value: '```json\n' + JSON.stringify(templates.basic, null, 2) + '\n```',
                    inline: false
                },
                {
                    name: '⏰ Template Batasan Waktu',
                    value: '```json\n' + JSON.stringify(templates.timeRestricted, null, 2) + '\n```',
                    inline: false
                },
                {
                    name: '🎭 Template Spesifik Role',
                    value: '```json\n' + JSON.stringify(templates.roleSpecific, null, 2) + '\n```',
                    inline: false
                }
            )
            .addFields(
                {
                    name: 'Contoh Penggunaan',
                    value: '`contextperms set #general {"admin":{"allowed":true},"staff":{"allowed":true,"hours":[9,17]}}`',
                    inline: false
                },
                {
                    name: 'Properti Tersedia',
                    value: '• `allowed` (boolean) - Apakah permission diizinkan\n• `hours` (array) - Jam yang diizinkan [mulai, selesai]\n• `days` (array) - Hari yang diizinkan (1=Senin, 7=Minggu)\n• `roles` (array) - Role yang diperlukan untuk permission ini',
                    inline: false
                }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};