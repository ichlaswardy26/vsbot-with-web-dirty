const { EmbedBuilder } = require('discord.js');
const rolePermissions = require('../../util/rolePermissions');
const logger = require('../../util/logger');

module.exports = {
    name: 'permgroups',
    aliases: ['permgroup', 'pg'],
    description: 'Manage permission groups and inheritance',
    usage: 'permgroups <list|create|delete|assign-user|remove-user|assign-role|remove-role|check-user|check-role|tree> [options]',
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
                case 'list':
                    await this.handleList(message, args.slice(1), client);
                    break;
                case 'create':
                    await this.handleCreate(message, args.slice(1), client);
                    break;
                case 'delete':
                    await this.handleDelete(message, args.slice(1), client);
                    break;
                case 'assign-user':
                    await this.handleAssignUser(message, args.slice(1), client);
                    break;
                case 'remove-user':
                    await this.handleRemoveUser(message, args.slice(1), client);
                    break;
                case 'assign-role':
                    await this.handleAssignRole(message, args.slice(1), client);
                    break;
                case 'remove-role':
                    await this.handleRemoveRole(message, args.slice(1), client);
                    break;
                case 'check-user':
                    await this.handleCheckUser(message, args.slice(1), client);
                    break;
                case 'check-role':
                    await this.handleCheckRole(message, args.slice(1), client);
                    break;
                case 'tree':
                    await this.handleTree(message, args.slice(1), client);
                    break;
                default: {
                    const helpEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('📋 Permission Groups Help')
                        .setDescription('Manage permission groups and inheritance')
                        .addFields(
                            { name: 'List Groups', value: '`permgroups list`', inline: false },
                            { name: 'Create Group', value: '`permgroups create <name> <permissions> [inherits] [description]`', inline: false },
                            { name: 'Delete Group', value: '`permgroups delete <name>`', inline: false },
                            { name: 'Assign to User', value: '`permgroups assign-user <user> <group> [reason]`', inline: false },
                            { name: 'Remove from User', value: '`permgroups remove-user <user> <group> [reason]`', inline: false },
                            { name: 'Assign to Role', value: '`permgroups assign-role <role> <group> [reason]`', inline: false },
                            { name: 'Remove from Role', value: '`permgroups remove-role <role> <group> [reason]`', inline: false },
                            { name: 'Check User', value: '`permgroups check-user <user>`', inline: false },
                            { name: 'Check Role', value: '`permgroups check-role <role>`', inline: false },
                            { name: 'Show Tree', value: '`permgroups tree [group]`', inline: false }
                        )
                        .setTimestamp();
                    
                    return message.reply({ embeds: [helpEmbed] });
                }
            }

        } catch (error) {
            await logger.logError(error, 'executing permgroups command');
            message.reply('❌ **|** Terjadi error saat menjalankan command.');
        }
    },

    async handleList(message) {
        const allGroups = rolePermissions.getAllGroups();
        const groupNames = Object.keys(allGroups);

        if (groupNames.length === 0) {
            return message.reply('❌ **|** Tidak ada permission group yang tersedia.');
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📋 Available Permission Groups')
            .setDescription(`Total: ${groupNames.length} group(s)`)
            .setTimestamp();

        for (const groupName of groupNames.slice(0, 10)) { // Limit to 10 groups
            const group = allGroups[groupName];
            const permissions = rolePermissions.getGroupDetails(groupName);
            
            embed.addFields({
                name: `${group.custom ? '🔧' : '🏛️'} ${groupName}`,
                value: `**Description:** ${group.description}\n**Direct Permissions:** ${group.permissions.join(', ') || 'None'}\n**Inherits:** ${group.inherits.join(', ') || 'None'}\n**All Permissions:** ${permissions.allPermissions.join(', ') || 'None'}`,
                inline: false
            });
        }

        if (groupNames.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${groupNames.length} groups` });
        }

        message.reply({ embeds: [embed] });
    },

    async handleCreate(message, args) {
        if (args.length < 2) {
            return message.reply('❌ **|** Usage: `permgroups create <name> <permissions> [inherits] [description]`\n**Example:** `permgroups create my-group admin,staff server-manager "Custom admin group"`');
        }

        const groupName = args[0];
        const permissionsStr = args[1];
        const inheritsStr = args[2] || '';
        const description = args.slice(3).join(' ') || 'Custom permission group';

        const permissions = permissionsStr.split(',').map(p => p.trim());
        const inherits = inheritsStr ? inheritsStr.split(',').map(g => g.trim()) : [];

        const result = await rolePermissions.createPermissionGroup(
            groupName,
            permissions,
            inherits,
            description,
            message.author.id
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal membuat permission group: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Permission Group Created')
            .addFields(
                { name: 'Group Name', value: groupName, inline: true },
                { name: 'Direct Permissions', value: result.directPermissions.join(', ') || 'None', inline: true },
                { name: 'Inherits From', value: result.inherits.join(', ') || 'None', inline: true },
                { name: 'All Permissions', value: result.permissions.join(', ') || 'None', inline: false },
                { name: 'Description', value: description, inline: false },
                { name: 'Created By', value: message.author.tag, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleDelete(message, args) {
        if (args.length < 1) {
            return message.reply('❌ **|** Usage: `permgroups delete <name>`');
        }

        const groupName = args[0];

        const result = await rolePermissions.deletePermissionGroup(groupName, message.author.id);

        if (!result.success) {
            return message.reply(`❌ **|** Gagal menghapus permission group: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🗑️ Permission Group Deleted')
            .addFields(
                { name: 'Group Name', value: result.deletedGroup, inline: true },
                { name: 'Deleted By', value: message.author.tag, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleAssignUser(message, args, client) {
        if (args.length < 2) {
            return message.reply('❌ **|** Usage: `permgroups assign-user <user> <group> [reason]`');
        }

        const userMention = args[0];
        const groupName = args[1];
        const reason = args.slice(2).join(' ') || 'No reason provided';

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** User tidak ditemukan.');
        }

        const result = await rolePermissions.assignGroupToUser(
            user.id,
            message.guild.id,
            groupName,
            message.author.id,
            reason
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal assign group ke user: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Permission Group Assigned to User')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Group', value: result.groupName, inline: true },
                { name: 'Permissions', value: result.permissions.join(', '), inline: false },
                { name: 'All User Groups', value: result.allUserGroups.join(', '), inline: false },
                { name: 'Assigned By', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleRemoveUser(message, args, client) {
        if (args.length < 2) {
            return message.reply('❌ **|** Usage: `permgroups remove-user <user> <group> [reason]`');
        }

        const userMention = args[0];
        const groupName = args[1];
        const reason = args.slice(2).join(' ') || 'No reason provided';

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** User tidak ditemukan.');
        }

        const result = await rolePermissions.removeGroupFromUser(
            user.id,
            message.guild.id,
            groupName,
            message.author.id,
            reason
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal remove group dari user: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🔄 Permission Group Removed from User')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Removed Group', value: result.removedGroup, inline: true },
                { name: 'Remaining Groups', value: result.remainingGroups.join(', ') || 'None', inline: false },
                { name: 'Removed By', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleAssignRole(message, args) {
        if (args.length < 2) {
            return message.reply('❌ **|** Usage: `permgroups assign-role <role> <group> [reason]`');
        }

        const roleMention = args[0];
        const groupName = args[1];
        const reason = args.slice(2).join(' ') || 'No reason provided';

        // Parse role
        const roleId = roleMention.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return message.reply('❌ **|** Role tidak ditemukan.');
        }

        const result = await rolePermissions.assignGroupToRole(
            role.id,
            groupName,
            message.author.id,
            reason
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal assign group ke role: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Permission Group Assigned to Role')
            .addFields(
                { name: 'Role', value: `${role.name} (${role.id})`, inline: true },
                { name: 'Group', value: result.groupName, inline: true },
                { name: 'Permissions', value: result.permissions.join(', '), inline: false },
                { name: 'All Role Groups', value: result.allRoleGroups.join(', '), inline: false },
                { name: 'Assigned By', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleRemoveRole(message, args) {
        if (args.length < 2) {
            return message.reply('❌ **|** Usage: `permgroups remove-role <role> <group> [reason]`');
        }

        const roleMention = args[0];
        const groupName = args[1];
        const reason = args.slice(2).join(' ') || 'No reason provided';

        // Parse role
        const roleId = roleMention.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return message.reply('❌ **|** Role tidak ditemukan.');
        }

        const result = await rolePermissions.removeGroupFromRole(
            role.id,
            groupName,
            message.author.id,
            reason
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal remove group dari role: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🔄 Permission Group Removed from Role')
            .addFields(
                { name: 'Role', value: `${role.name} (${role.id})`, inline: true },
                { name: 'Removed Group', value: result.removedGroup, inline: true },
                { name: 'Remaining Groups', value: result.remainingGroups.join(', ') || 'None', inline: false },
                { name: 'Removed By', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleCheckUser(message, args, client) {
        if (args.length < 1) {
            return message.reply('❌ **|** Usage: `permgroups check-user <user>`');
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

        const userGroups = rolePermissions.getUserGroups(user.id, message.guild.id);
        const completePermissions = await rolePermissions.getCompleteUserPermissions(member);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`👤 User Permission Groups - ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        // User groups
        embed.addFields({
            name: '👥 Direct User Groups',
            value: userGroups.length > 0 ? userGroups.join(', ') : 'None',
            inline: false
        });

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
        } else {
            embed.addFields({
                name: '🎭 Role Groups',
                value: 'None',
                inline: false
            });
        }

        // Inherited permissions
        embed.addFields({
            name: '🔗 Inherited Permissions',
            value: completePermissions.inheritedPermissions.length > 0 ? 
                completePermissions.inheritedPermissions.join(', ') : 'None',
            inline: false
        });

        message.reply({ embeds: [embed] });
    },

    async handleCheckRole(message, args) {
        if (args.length < 1) {
            return message.reply('❌ **|** Usage: `permgroups check-role <role>`');
        }

        const roleMention = args[0];
        const roleId = roleMention.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return message.reply('❌ **|** Role tidak ditemukan.');
        }

        const roleGroups = rolePermissions.getRoleGroups(role.id);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`🎭 Role Permission Groups - ${role.name}`)
            .setTimestamp();

        embed.addFields({
            name: '👥 Assigned Groups',
            value: roleGroups.length > 0 ? roleGroups.join(', ') : 'None',
            inline: false
        });

        if (roleGroups.length > 0) {
            const allPermissions = new Set();
            for (const groupName of roleGroups) {
                const groupDetails = rolePermissions.getGroupDetails(groupName);
                if (groupDetails) {
                    groupDetails.allPermissions.forEach(perm => allPermissions.add(perm));
                }
            }

            embed.addFields({
                name: '🔗 All Permissions from Groups',
                value: Array.from(allPermissions).join(', ') || 'None',
                inline: false
            });
        }

        embed.addFields(
            { name: 'Role ID', value: role.id, inline: true },
            { name: 'Members', value: role.members.size.toString(), inline: true },
            { name: 'Color', value: role.hexColor, inline: true }
        );

        message.reply({ embeds: [embed] });
    },

    async handleTree(message, args) {
        const groupName = args[0];
        
        if (groupName) {
            // Show tree for specific group
            const groupDetails = rolePermissions.getGroupDetails(groupName);
            if (!groupDetails) {
                return message.reply('❌ **|** Permission group tidak ditemukan.');
            }

            const permissionInheritance = require('../../util/permissionInheritance');
            const tree = permissionInheritance.getInheritanceTree(groupName);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`🌳 Inheritance Tree - ${groupName}`)
                .setTimestamp();

            let treeText = '';
            for (const node of tree) {
                const indent = '  '.repeat(node.depth);
                const prefix = node.depth === 0 ? '🔹' : '└─';
                treeText += `${indent}${prefix} **${node.name}**\n`;
                treeText += `${indent}   Permissions: ${node.permissions.join(', ') || 'None'}\n`;
                treeText += `${indent}   Description: ${node.description}\n\n`;
            }

            embed.setDescription(treeText || 'No inheritance tree found');
            message.reply({ embeds: [embed] });
        } else {
            // Show all groups overview
            const allGroups = rolePermissions.getAllGroups();
            const groupNames = Object.keys(allGroups);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🌳 All Permission Groups Overview')
                .setDescription(`Total: ${groupNames.length} group(s)`)
                .setTimestamp();

            let groupsText = '';
            for (const name of groupNames.slice(0, 15)) { // Limit to 15 groups
                const group = allGroups[name];
                const icon = group.custom ? '🔧' : '🏛️';
                groupsText += `${icon} **${name}** - ${group.description}\n`;
                groupsText += `   Permissions: ${group.permissions.join(', ') || 'None'}\n`;
                groupsText += `   Inherits: ${group.inherits.join(', ') || 'None'}\n\n`;
            }

            embed.setDescription(groupsText || 'No groups found');
            
            if (groupNames.length > 15) {
                embed.setFooter({ text: `Showing 15 of ${groupNames.length} groups. Use 'permgroups tree <group>' for specific inheritance tree.` });
            }

            message.reply({ embeds: [embed] });
        }
    }
};