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
    
    async execute(message, args, client) {
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
                    const helpEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('📋 Context Permissions Help')
                        .setDescription('Manage context-based permissions for channels and categories')
                        .addFields(
                            { name: 'Set Permissions', value: '`contextperms set <channel> <permissions_json>`', inline: false },
                            { name: 'Get Permissions', value: '`contextperms get <channel>`', inline: false },
                            { name: 'Remove Permissions', value: '`contextperms remove <channel>`', inline: false },
                            { name: 'User Override', value: '`contextperms user-override <user> <channel> <permissions> <duration>`', inline: false },
                            { name: 'Role Permissions', value: '`contextperms role-perms <role> <channel> <permissions>`', inline: false },
                            { name: 'Check User', value: '`contextperms check <user> <channel> <permission>`', inline: false },
                            { name: 'List All', value: '`contextperms list`', inline: false },
                            { name: 'Show Template', value: '`contextperms template`', inline: false }
                        )
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
        if (args.length < 2) {
            return message.reply('❌ **|** Usage: `contextperms set <channel> <permissions_json>`\n**Example:** `contextperms set #general {"admin":{"allowed":true},"staff":{"allowed":true,"hours":[9,17]}}`');
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
            'Set via contextperms command'
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal mengatur context permissions: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Context Permissions Set')
            .addFields(
                { name: 'Channel/Category', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Type', value: contextType, inline: true },
                { name: 'Permissions', value: '```json\n' + JSON.stringify(permissions, null, 2) + '\n```', inline: false },
                { name: 'Set By', value: message.author.tag, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleGet(message, args) {
        if (args.length < 1) {
            return message.reply('❌ **|** Usage: `contextperms get <channel>`');
        }

        const channelMention = args[0];
        const channelId = channelMention.replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            return message.reply('❌ **|** Channel tidak ditemukan.');
        }

        const permissions = contextPermissions.getContextPermissions(channel.id);
        if (!permissions) {
            return message.reply('❌ **|** Tidak ada context permissions yang ditemukan untuk channel ini.');
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📋 Context Permissions')
            .addFields(
                { name: 'Channel/Category', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Type', value: permissions.contextType, inline: true },
                { name: 'Set By', value: `<@${permissions.setBy}>`, inline: true },
                { name: 'Set At', value: `<t:${Math.floor(permissions.setAt / 1000)}:F>`, inline: true },
                { name: 'Permissions', value: '```json\n' + JSON.stringify(permissions.permissions, null, 2) + '\n```', inline: false }
            )
            .setTimestamp();

        if (permissions.reason) {
            embed.addFields({ name: 'Reason', value: permissions.reason, inline: false });
        }

        message.reply({ embeds: [embed] });
    },

    async handleRemove(message, args) {
        if (args.length < 1) {
            return message.reply('❌ **|** Usage: `contextperms remove <channel>`');
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
            'Removed via contextperms command'
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal menghapus context permissions: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🗑️ Context Permissions Removed')
            .addFields(
                { name: 'Channel/Category', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Removed By', value: message.author.tag, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleUserOverride(message, args, client) {
        if (args.length < 4) {
            return message.reply('❌ **|** Usage: `contextperms user-override <user> <channel> <permissions> <duration>`\n**Example:** `contextperms user-override @user #general admin,staff 2h`');
        }

        const userMention = args[0];
        const channelMention = args[1];
        const permissionsStr = args[2];
        const duration = args[3];

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** User tidak ditemukan.');
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
            'Set via contextperms command'
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal mengatur user override: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ User Override Set')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Channel', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Permissions', value: permissions.join(', '), inline: true },
                { name: 'Duration', value: result.durationFormatted, inline: true },
                { name: 'Expires', value: `<t:${Math.floor(result.expiry / 1000)}:R>`, inline: true },
                { name: 'Set By', value: message.author.tag, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleRolePerms(message, args) {
        if (args.length < 3) {
            return message.reply('❌ **|** Usage: `contextperms role-perms <role> <channel> <permissions>`\n**Example:** `contextperms role-perms @Moderator #general admin,staff`');
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
            'Set via contextperms command'
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal mengatur role permissions: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Role Context Permissions Set')
            .addFields(
                { name: 'Role', value: `${role.name} (${role.id})`, inline: true },
                { name: 'Channel', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Permissions', value: permissions.join(', '), inline: true },
                { name: 'Set By', value: message.author.tag, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleCheck(message, args, client) {
        if (args.length < 3) {
            return message.reply('❌ **|** Usage: `contextperms check <user> <channel> <permission>`');
        }

        const userMention = args[0];
        const channelMention = args[1];
        const permission = args[2];

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** User tidak ditemukan.');
        }

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return message.reply('❌ **|** User tidak ditemukan di server ini.');
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
            .setColor(hasPermission ? '#00ff00' : '#ff0000')
            .setTitle(`${hasPermission ? '✅' : '❌'} Context Permission Check`)
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Channel', value: `${channel.name} (${channel.id})`, inline: true },
                { name: 'Permission', value: permission, inline: true },
                { name: 'Result', value: hasPermission ? 'ALLOWED' : 'DENIED', inline: true }
            )
            .setTimestamp();

        if (analysis.contextPermissions) {
            embed.addFields({
                name: 'Context Permissions',
                value: '```json\n' + JSON.stringify(analysis.contextPermissions, null, 2) + '\n```',
                inline: false
            });
        }

        if (analysis.userOverride) {
            embed.addFields({
                name: 'User Override',
                value: `**Permissions:** ${analysis.userOverride.permissions.join(', ')}\n**Expires:** <t:${Math.floor(analysis.userOverride.expiry / 1000)}:R>`,
                inline: false
            });
        }

        if (analysis.rolePermissions.length > 0) {
            const rolePermsText = analysis.rolePermissions
                .map(rp => `**${rp.roleName}:** ${rp.permissions.join(', ')}`)
                .join('\n');
            embed.addFields({
                name: 'Role Permissions',
                value: rolePermsText,
                inline: false
            });
        }

        message.reply({ embeds: [embed] });
    },

    async handleList(message) {
        const allPermissions = contextPermissions.getGuildContextPermissions(message.guild.id);

        if (allPermissions.length === 0) {
            return message.reply('❌ **|** Tidak ada context permissions yang ditemukan di server ini.');
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📋 All Context Permissions')
            .setDescription(`Total: ${allPermissions.length} context permission(s)`)
            .setTimestamp();

        for (const perm of allPermissions.slice(0, 10)) { // Limit to 10 entries
            const channel = message.guild.channels.cache.get(perm.contextId);
            const channelName = channel ? channel.name : `Unknown (${perm.contextId})`;
            
            embed.addFields({
                name: `${perm.contextType === 'category' ? '📁' : '#'} ${channelName}`,
                value: `**Type:** ${perm.contextType}\n**Set By:** <@${perm.setBy}>\n**Set At:** <t:${Math.floor(perm.setAt / 1000)}:R>\n**Permissions:** ${Object.keys(perm.permissions).join(', ')}`,
                inline: true
            });
        }

        if (allPermissions.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${allPermissions.length} context permissions` });
        }

        message.reply({ embeds: [embed] });
    },

    async handleTemplate(message) {
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
            .setColor('#0099ff')
            .setTitle('📋 Context Permissions Templates')
            .setDescription('Copy and modify these templates for your needs')
            .addFields(
                {
                    name: '🔹 Basic Template',
                    value: '```json\n' + JSON.stringify(templates.basic, null, 2) + '\n```',
                    inline: false
                },
                {
                    name: '⏰ Time-Restricted Template',
                    value: '```json\n' + JSON.stringify(templates.timeRestricted, null, 2) + '\n```',
                    inline: false
                },
                {
                    name: '🎭 Role-Specific Template',
                    value: '```json\n' + JSON.stringify(templates.roleSpecific, null, 2) + '\n```',
                    inline: false
                }
            )
            .addFields(
                {
                    name: 'Usage Example',
                    value: '`contextperms set #general {"admin":{"allowed":true},"staff":{"allowed":true,"hours":[9,17]}}`',
                    inline: false
                },
                {
                    name: 'Available Properties',
                    value: '• `allowed` (boolean) - Whether permission is allowed\n• `hours` (array) - Allowed hours [start, end]\n• `days` (array) - Allowed days (1=Monday, 7=Sunday)\n• `roles` (array) - Required roles for this permission',
                    inline: false
                }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};