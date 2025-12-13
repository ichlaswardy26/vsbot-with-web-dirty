const { EmbedBuilder } = require('discord.js');
const rolePermissions = require('../../util/rolePermissions');
const logger = require('../../util/logger');

module.exports = {
    name: 'temppermissions',
    aliases: ['tempperm', 'tp'],
    description: 'Manage temporary permissions for users',
    usage: 'temppermissions <grant|revoke|extend|list|check> [options]',
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
                    const helpEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('📋 Temporary Permissions Help')
                        .setDescription('Manage temporary permissions for users')
                        .addFields(
                            { name: 'Grant Permission', value: '`temppermissions grant <user> <permission> <duration> [reason]`', inline: false },
                            { name: 'Revoke Permission', value: '`temppermissions revoke <user> [permission] [reason]`', inline: false },
                            { name: 'Extend Permission', value: '`temppermissions extend <user> <duration> [reason]`', inline: false },
                            { name: 'List Permissions', value: '`temppermissions list [user]`', inline: false },
                            { name: 'Check Permissions', value: '`temppermissions check <user>`', inline: false }
                        )
                        .addFields(
                            { name: 'Valid Permissions', value: 'admin, staff, moderator, economy, giveaway, ticket, shop', inline: false },
                            { name: 'Duration Format', value: '1s, 30m, 2h, 7d (max: 7 days)', inline: false }
                        )
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
        if (args.length < 3) {
            return message.reply('❌ **|** Usage: `temppermissions grant <user> <permission> <duration> [reason]`');
        }

        const userMention = args[0];
        const permission = args[1].toLowerCase();
        const duration = args[2];
        const reason = args.slice(3).join(' ') || 'No reason provided';

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
            return message.reply(`❌ **|** Gagal memberikan temporary permission: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Temporary Permission Granted')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Permission', value: result.permissions.join(', '), inline: true },
                { name: 'Duration', value: result.durationFormatted, inline: true },
                { name: 'Expires', value: `<t:${Math.floor(result.expiry / 1000)}:R>`, inline: true },
                { name: 'Granted By', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleRevoke(message, args, client) {
        if (args.length < 1) {
            return message.reply('❌ **|** Usage: `temppermissions revoke <user> [permission] [reason]`');
        }

        const userMention = args[0];
        const permission = args[1]?.toLowerCase() || null;
        const reason = args.slice(permission ? 2 : 1).join(' ') || 'No reason provided';

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** User tidak ditemukan.');
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
            return message.reply(`❌ **|** Gagal mencabut temporary permission: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🔄 Temporary Permission Revoked')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Revoked Permissions', value: result.revokedPermissions.join(', ') || 'All', inline: true },
                { name: 'Remaining Permissions', value: result.remainingPermissions.join(', ') || 'None', inline: true },
                { name: 'Revoked By', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleExtend(message, args, client) {
        if (args.length < 2) {
            return message.reply('❌ **|** Usage: `temppermissions extend <user> <duration> [reason]`');
        }

        const userMention = args[0];
        const additionalDuration = args[1];
        const reason = args.slice(2).join(' ') || 'No reason provided';

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** User tidak ditemukan.');
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
            return message.reply(`❌ **|** Gagal memperpanjang temporary permission: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('⏰ Temporary Permission Extended')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Additional Duration', value: result.additionalDurationFormatted, inline: true },
                { name: 'New Expiry', value: `<t:${Math.floor(result.newExpiry / 1000)}:R>`, inline: true },
                { name: 'Extended By', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleList(message, args, client) {
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
                `❌ **|** ${user} tidak memiliki temporary permission yang aktif.` :
                '❌ **|** Tidak ada temporary permission yang aktif di server ini.';
            return message.reply(message_text);
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📋 Active Temporary Permissions${user ? ` - ${user.tag}` : ''}`)
            .setDescription(`Total: ${permissions.length} active permission(s)`)
            .setTimestamp();

        for (const perm of permissions.slice(0, 10)) { // Limit to 10 entries
            const permUser = await client.users.fetch(perm.userId).catch(() => null);
            const userName = permUser ? permUser.tag : `Unknown User (${perm.userId})`;
            
            embed.addFields({
                name: `👤 ${userName}`,
                value: `**Permissions:** ${perm.permissions.join(', ')}\n**Expires:** <t:${Math.floor(perm.expiry / 1000)}:R>\n**Time Left:** ${perm.timeRemainingFormatted}`,
                inline: true
            });
        }

        if (permissions.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${permissions.length} permissions` });
        }

        message.reply({ embeds: [embed] });
    },

    async handleCheck(message, args, client) {
        if (args.length < 1) {
            return message.reply('❌ **|** Usage: `temppermissions check <user>`');
        }

        const userMention = args[0];
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** User tidak ditemukan.');
        }

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return message.reply('❌ **|** User tidak ditemukan di server ini.');
        }

        // Get complete user permissions
        const completePermissions = await rolePermissions.getCompleteUserPermissions(member);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`🔍 Complete Permission Analysis - ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        // Direct permissions
        const directPerms = Object.entries(completePermissions.directPermissions)
            .filter(([, hasPermission]) => hasPermission)
            .map(([permission]) => permission);
        
        embed.addFields({
            name: '🎯 Direct Permissions',
            value: directPerms.length > 0 ? directPerms.join(', ') : 'None',
            inline: false
        });

        // Temporary permissions
        if (completePermissions.temporaryPermissions) {
            const tempPerms = completePermissions.temporaryPermissions;
            embed.addFields({
                name: '⏰ Temporary Permissions',
                value: `**Permissions:** ${tempPerms.permissions.join(', ')}\n**Expires:** <t:${Math.floor(tempPerms.expiry / 1000)}:R>\n**Time Left:** ${tempPerms.timeRemainingFormatted}`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '⏰ Temporary Permissions',
                value: 'None',
                inline: false
            });
        }

        // Inherited permissions
        if (completePermissions.inheritedPermissions.length > 0) {
            embed.addFields({
                name: '🔗 Inherited Permissions',
                value: completePermissions.inheritedPermissions.join(', '),
                inline: false
            });
        } else {
            embed.addFields({
                name: '🔗 Inherited Permissions',
                value: 'None',
                inline: false
            });
        }

        // User groups
        if (completePermissions.userGroups.length > 0) {
            embed.addFields({
                name: '👥 User Groups',
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
                name: '🎭 Role Groups',
                value: roleGroupsText,
                inline: false
            });
        }

        // All effective permissions
        embed.addFields({
            name: '✅ All Effective Permissions',
            value: completePermissions.allPermissions.length > 0 ? completePermissions.allPermissions.join(', ') : 'None',
            inline: false
        });

        message.reply({ embeds: [embed] });
    }
};