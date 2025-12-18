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
                    const config = require('../../config');
                    const helpEmbed = new EmbedBuilder()
                        .setColor(config.colors?.primary || '#5865F2')
                        .setTitle('📋 Bantuan Grup Permission')
                        .setDescription('Kelola grup permission dan inheritance')
                        .setThumbnail(message.guild.iconURL({ dynamic: true }))
                        .addFields(
                            { name: 'Daftar Grup', value: '`permgroups list`', inline: false },
                            { name: 'Buat Grup', value: '`permgroups create <nama> <permissions> [inherits] [deskripsi]`', inline: false },
                            { name: 'Hapus Grup', value: '`permgroups delete <nama>`', inline: false },
                            { name: 'Assign ke Pengguna', value: '`permgroups assign-user <user> <grup> [alasan]`', inline: false },
                            { name: 'Hapus dari Pengguna', value: '`permgroups remove-user <user> <grup> [alasan]`', inline: false },
                            { name: 'Assign ke Role', value: '`permgroups assign-role <role> <grup> [alasan]`', inline: false },
                            { name: 'Hapus dari Role', value: '`permgroups remove-role <role> <grup> [alasan]`', inline: false },
                            { name: 'Cek Pengguna', value: '`permgroups check-user <user>`', inline: false },
                            { name: 'Cek Role', value: '`permgroups check-role <role>`', inline: false },
                            { name: 'Tampilkan Tree', value: '`permgroups tree [grup]`', inline: false }
                        )
                        .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
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
        const config = require('../../config');
        const allGroups = rolePermissions.getAllGroups();
        const groupNames = Object.keys(allGroups);

        if (groupNames.length === 0) {
            return message.reply('❌ **|** Tidak ada grup permission yang tersedia.');
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle('📋 Grup Permission Tersedia')
            .setDescription(`Total: ${groupNames.length} grup`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        for (const groupName of groupNames.slice(0, 10)) { // Limit to 10 groups
            const group = allGroups[groupName];
            const permissions = rolePermissions.getGroupDetails(groupName);
            
            embed.addFields({
                name: `${group.custom ? '🔧' : '🏛️'} ${groupName}`,
                value: `**Deskripsi:** ${group.description}\n**Permission Langsung:** ${group.permissions.join(', ') || 'Tidak ada'}\n**Mewarisi:** ${group.inherits.join(', ') || 'Tidak ada'}\n**Semua Permission:** ${permissions.allPermissions.join(', ') || 'Tidak ada'}`,
                inline: false
            });
        }

        if (groupNames.length > 10) {
            embed.setFooter({ text: `Menampilkan 10 dari ${groupNames.length} grup` });
        } else {
            embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        }

        message.reply({ embeds: [embed] });
    },

    async handleCreate(message, args) {
        const config = require('../../config');
        if (args.length < 2) {
            return message.reply('❌ **|** Penggunaan: `permgroups create <nama> <permissions> [inherits] [deskripsi]`\n**Contoh:** `permgroups create my-group admin,staff server-manager "Grup admin kustom"`');
        }

        const groupName = args[0];
        const permissionsStr = args[1];
        const inheritsStr = args[2] || '';
        const description = args.slice(3).join(' ') || 'Grup permission kustom';

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
            return message.reply(`❌ **|** Gagal membuat grup permission: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.success || '#57F287')
            .setTitle('✅ Grup Permission Dibuat')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Nama Grup', value: groupName, inline: true },
                { name: 'Permission Langsung', value: result.directPermissions.join(', ') || 'Tidak ada', inline: true },
                { name: 'Mewarisi Dari', value: result.inherits.join(', ') || 'Tidak ada', inline: true },
                { name: 'Semua Permission', value: result.permissions.join(', ') || 'Tidak ada', inline: false },
                { name: 'Deskripsi', value: description, inline: false },
                { name: 'Dibuat Oleh', value: message.author.tag, inline: true }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleDelete(message, args) {
        const config = require('../../config');
        if (args.length < 1) {
            return message.reply('❌ **|** Penggunaan: `permgroups delete <nama>`');
        }

        const groupName = args[0];

        const result = await rolePermissions.deletePermissionGroup(groupName, message.author.id);

        if (!result.success) {
            return message.reply(`❌ **|** Gagal menghapus grup permission: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.warning || '#FEE75C')
            .setTitle('🗑️ Grup Permission Dihapus')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Nama Grup', value: result.deletedGroup, inline: true },
                { name: 'Dihapus Oleh', value: message.author.tag, inline: true }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleAssignUser(message, args, client) {
        const config = require('../../config');
        if (args.length < 2) {
            return message.reply('❌ **|** Penggunaan: `permgroups assign-user <user> <grup> [alasan]`');
        }

        const userMention = args[0];
        const groupName = args[1];
        const reason = args.slice(2).join(' ') || 'Tidak ada alasan';

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** Pengguna tidak ditemukan.');
        }

        const result = await rolePermissions.assignGroupToUser(
            user.id,
            message.guild.id,
            groupName,
            message.author.id,
            reason
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal assign grup ke pengguna: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.success || '#57F287')
            .setTitle('✅ Grup Permission Diberikan ke Pengguna')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Pengguna', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Grup', value: result.groupName, inline: true },
                { name: 'Permission', value: result.permissions.join(', '), inline: false },
                { name: 'Semua Grup Pengguna', value: result.allUserGroups.join(', '), inline: false },
                { name: 'Diberikan Oleh', value: message.author.tag, inline: true },
                { name: 'Alasan', value: reason, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleRemoveUser(message, args, client) {
        const config = require('../../config');
        if (args.length < 2) {
            return message.reply('❌ **|** Penggunaan: `permgroups remove-user <user> <grup> [alasan]`');
        }

        const userMention = args[0];
        const groupName = args[1];
        const reason = args.slice(2).join(' ') || 'Tidak ada alasan';

        // Parse user
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply('❌ **|** Pengguna tidak ditemukan.');
        }

        const result = await rolePermissions.removeGroupFromUser(
            user.id,
            message.guild.id,
            groupName,
            message.author.id,
            reason
        );

        if (!result.success) {
            return message.reply(`❌ **|** Gagal menghapus grup dari pengguna: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.warning || '#FEE75C')
            .setTitle('🔄 Grup Permission Dihapus dari Pengguna')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Pengguna', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Grup Dihapus', value: result.removedGroup, inline: true },
                { name: 'Grup Tersisa', value: result.remainingGroups.join(', ') || 'Tidak ada', inline: false },
                { name: 'Dihapus Oleh', value: message.author.tag, inline: true },
                { name: 'Alasan', value: reason, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleAssignRole(message, args) {
        const config = require('../../config');
        if (args.length < 2) {
            return message.reply('❌ **|** Penggunaan: `permgroups assign-role <role> <grup> [alasan]`');
        }

        const roleMention = args[0];
        const groupName = args[1];
        const reason = args.slice(2).join(' ') || 'Tidak ada alasan';

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
            return message.reply(`❌ **|** Gagal assign grup ke role: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.success || '#57F287')
            .setTitle('✅ Grup Permission Diberikan ke Role')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Role', value: `${role.name} (${role.id})`, inline: true },
                { name: 'Grup', value: result.groupName, inline: true },
                { name: 'Permission', value: result.permissions.join(', '), inline: false },
                { name: 'Semua Grup Role', value: result.allRoleGroups.join(', '), inline: false },
                { name: 'Diberikan Oleh', value: message.author.tag, inline: true },
                { name: 'Alasan', value: reason, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleRemoveRole(message, args) {
        const config = require('../../config');
        if (args.length < 2) {
            return message.reply('❌ **|** Penggunaan: `permgroups remove-role <role> <grup> [alasan]`');
        }

        const roleMention = args[0];
        const groupName = args[1];
        const reason = args.slice(2).join(' ') || 'Tidak ada alasan';

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
            return message.reply(`❌ **|** Gagal menghapus grup dari role: ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors?.warning || '#FEE75C')
            .setTitle('🔄 Grup Permission Dihapus dari Role')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Role', value: `${role.name} (${role.id})`, inline: true },
                { name: 'Grup Dihapus', value: result.removedGroup, inline: true },
                { name: 'Grup Tersisa', value: result.remainingGroups.join(', ') || 'Tidak ada', inline: false },
                { name: 'Dihapus Oleh', value: message.author.tag, inline: true },
                { name: 'Alasan', value: reason, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async handleCheckUser(message, args, client) {
        const config = require('../../config');
        if (args.length < 1) {
            return message.reply('❌ **|** Penggunaan: `permgroups check-user <user>`');
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

        const userGroups = rolePermissions.getUserGroups(user.id, message.guild.id);
        const completePermissions = await rolePermissions.getCompleteUserPermissions(member);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle(`👤 Grup Permission Pengguna - ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        // User groups
        embed.addFields({
            name: '👥 Grup Pengguna Langsung',
            value: userGroups.length > 0 ? userGroups.join(', ') : 'Tidak ada',
            inline: false
        });

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
        } else {
            embed.addFields({
                name: '🎭 Grup Role',
                value: 'Tidak ada',
                inline: false
            });
        }

        // Inherited permissions
        embed.addFields({
            name: '🔗 Permission Diwarisi',
            value: completePermissions.inheritedPermissions.length > 0 ? 
                completePermissions.inheritedPermissions.join(', ') : 'Tidak ada',
            inline: false
        });

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        message.reply({ embeds: [embed] });
    },

    async handleCheckRole(message, args) {
        const config = require('../../config');
        if (args.length < 1) {
            return message.reply('❌ **|** Penggunaan: `permgroups check-role <role>`');
        }

        const roleMention = args[0];
        const roleId = roleMention.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return message.reply('❌ **|** Role tidak ditemukan.');
        }

        const roleGroups = rolePermissions.getRoleGroups(role.id);

        const embed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle(`🎭 Grup Permission Role - ${role.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        embed.addFields({
            name: '👥 Grup yang Diberikan',
            value: roleGroups.length > 0 ? roleGroups.join(', ') : 'Tidak ada',
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
                name: '🔗 Semua Permission dari Grup',
                value: Array.from(allPermissions).join(', ') || 'Tidak ada',
                inline: false
            });
        }

        embed.addFields(
            { name: 'ID Role', value: role.id, inline: true },
            { name: 'Anggota', value: role.members.size.toString(), inline: true },
            { name: 'Warna', value: role.hexColor, inline: true }
        );

        embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        message.reply({ embeds: [embed] });
    },

    async handleTree(message, args) {
        const config = require('../../config');
        const groupName = args[0];
        
        if (groupName) {
            // Show tree for specific group
            const groupDetails = rolePermissions.getGroupDetails(groupName);
            if (!groupDetails) {
                return message.reply('❌ **|** Grup permission tidak ditemukan.');
            }

            const permissionInheritance = require('../../util/permissionInheritance');
            const tree = permissionInheritance.getInheritanceTree(groupName);

            const embed = new EmbedBuilder()
                .setColor(config.colors?.primary || '#5865F2')
                .setTitle(`🌳 Tree Inheritance - ${groupName}`)
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setTimestamp();

            let treeText = '';
            for (const node of tree) {
                const indent = '  '.repeat(node.depth);
                const prefix = node.depth === 0 ? '🔹' : '└─';
                treeText += `${indent}${prefix} **${node.name}**\n`;
                treeText += `${indent}   Permission: ${node.permissions.join(', ') || 'Tidak ada'}\n`;
                treeText += `${indent}   Deskripsi: ${node.description}\n\n`;
            }

            embed.setDescription(treeText || 'Tree inheritance tidak ditemukan');
            embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
            message.reply({ embeds: [embed] });
        } else {
            // Show all groups overview
            const allGroups = rolePermissions.getAllGroups();
            const groupNames = Object.keys(allGroups);

            const embed = new EmbedBuilder()
                .setColor(config.colors?.primary || '#5865F2')
                .setTitle('🌳 Ringkasan Semua Grup Permission')
                .setDescription(`Total: ${groupNames.length} grup`)
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setTimestamp();

            let groupsText = '';
            for (const name of groupNames.slice(0, 15)) { // Limit to 15 groups
                const group = allGroups[name];
                const icon = group.custom ? '🔧' : '🏛️';
                groupsText += `${icon} **${name}** - ${group.description}\n`;
                groupsText += `   Permission: ${group.permissions.join(', ') || 'Tidak ada'}\n`;
                groupsText += `   Mewarisi: ${group.inherits.join(', ') || 'Tidak ada'}\n\n`;
            }

            embed.setDescription(groupsText || 'Tidak ada grup ditemukan');
            
            if (groupNames.length > 15) {
                embed.setFooter({ text: `Menampilkan 15 dari ${groupNames.length} grup. Gunakan 'permgroups tree <grup>' untuk tree inheritance spesifik.` });
            } else {
                embed.setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
            }

            message.reply({ embeds: [embed] });
        }
    }
};