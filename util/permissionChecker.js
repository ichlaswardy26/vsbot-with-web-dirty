const { PermissionsBitField } = require('discord.js');
const config = require('../config');

/**
 * Permission Checker Utility
 * Provides helper functions untuk check permissions
 */

class PermissionChecker {
    /**
     * Check if user is bot owner
     * @param {string} userId - Discord user ID
     * @returns {boolean}
     */
    isOwner(userId) {
        return config.ownerIds?.includes(userId) || false;
    }

    /**
     * Check if member has specific permission
     * @param {GuildMember} member - Discord guild member
     * @param {string|bigint} permission - Permission flag
     * @returns {boolean}
     */
    hasPermission(member, permission) {
        if (!member || !member.permissions) return false;
        return member.permissions.has(permission);
    }

    /**
     * Check if member is administrator
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    isAdmin(member) {
        if (!member) return false;
        return this.isOwner(member.user.id) || this.hasPermission(member, PermissionsBitField.Flags.Administrator);
    }

    /**
     * Check if member is moderator (has manage messages or kick members)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    isModerator(member) {
        if (!member) return false;
        return this.isAdmin(member) || 
               this.hasPermission(member, PermissionsBitField.Flags.ManageMessages) ||
               this.hasPermission(member, PermissionsBitField.Flags.KickMembers);
    }

    /**
     * Check if member has specific role
     * @param {GuildMember} member - Discord guild member
     * @param {string} roleId - Role ID to check
     * @returns {boolean}
     */
    hasRole(member, roleId) {
        if (!member || !member.roles) return false;
        return member.roles.cache.has(roleId);
    }

    /**
     * Check if member has any of the specified roles
     * @param {GuildMember} member - Discord guild member
     * @param {Array<string>} roleIds - Array of role IDs
     * @returns {boolean}
     */
    hasAnyRole(member, roleIds) {
        if (!member || !member.roles || !Array.isArray(roleIds)) return false;
        return roleIds.some(roleId => member.roles.cache.has(roleId));
    }

    /**
     * Check if bot has permission in channel
     * @param {Channel} channel - Discord channel
     * @param {string|bigint} permission - Permission flag
     * @returns {boolean}
     */
    botHasPermission(channel, permission) {
        if (!channel || !channel.guild) return false;
        const botMember = channel.guild.members.cache.get(channel.client.user.id);
        if (!botMember) return false;
        
        const permissions = channel.permissionsFor(botMember);
        return permissions ? permissions.has(permission) : false;
    }

    /**
     * Check if bot can send messages in channel
     * @param {Channel} channel - Discord channel
     * @returns {boolean}
     */
    canSendMessages(channel) {
        return this.botHasPermission(channel, PermissionsBitField.Flags.SendMessages);
    }

    /**
     * Check if bot can embed links in channel
     * @param {Channel} channel - Discord channel
     * @returns {boolean}
     */
    canEmbedLinks(channel) {
        return this.botHasPermission(channel, PermissionsBitField.Flags.EmbedLinks);
    }

    /**
     * Check if bot can manage messages in channel
     * @param {Channel} channel - Discord channel
     * @returns {boolean}
     */
    canManageMessages(channel) {
        return this.botHasPermission(channel, PermissionsBitField.Flags.ManageMessages);
    }

    /**
     * Check if bot can manage roles
     * @param {Guild} guild - Discord guild
     * @returns {boolean}
     */
    canManageRoles(guild) {
        if (!guild) return false;
        const botMember = guild.members.cache.get(guild.client.user.id);
        return botMember ? botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) : false;
    }

    /**
     * Check if bot can manage channels
     * @param {Guild} guild - Discord guild
     * @returns {boolean}
     */
    canManageChannels(guild) {
        if (!guild) return false;
        const botMember = guild.members.cache.get(guild.client.user.id);
        return botMember ? botMember.permissions.has(PermissionsBitField.Flags.ManageChannels) : false;
    }

    /**
     * Get missing permissions for bot
     * @param {Channel} channel - Discord channel
     * @param {Array<string|bigint>} requiredPermissions - Array of required permissions
     * @returns {Array<string>} Array of missing permission names
     */
    getMissingPermissions(channel, requiredPermissions) {
        if (!channel || !channel.guild) return requiredPermissions;
        
        const botMember = channel.guild.members.cache.get(channel.client.user.id);
        if (!botMember) return requiredPermissions;
        
        const permissions = channel.permissionsFor(botMember);
        if (!permissions) return requiredPermissions;
        
        const missing = [];
        for (const permission of requiredPermissions) {
            if (!permissions.has(permission)) {
                // Convert permission flag to readable name
                const permName = Object.keys(PermissionsBitField.Flags).find(
                    key => PermissionsBitField.Flags[key] === permission
                );
                missing.push(permName || permission.toString());
            }
        }
        
        return missing;
    }

    /**
     * Create permission error message
     * @param {string} requiredPermission - Required permission name
     * @returns {string} Error message
     */
    createPermissionError(requiredPermission) {
        return `❌ Kamu memerlukan permission **${requiredPermission}** untuk menggunakan command ini.`;
    }

    /**
     * Create bot permission error message
     * @param {Array<string>} missingPermissions - Array of missing permissions
     * @returns {string} Error message
     */
    createBotPermissionError(missingPermissions) {
        if (missingPermissions.length === 0) return '';
        
        const permList = missingPermissions.map(p => `**${p}**`).join(', ');
        return `❌ Bot memerlukan permission berikut: ${permList}`;
    }

    /**
     * Check if member can manage another member (role hierarchy)
     * @param {GuildMember} executor - Member executing the action
     * @param {GuildMember} target - Target member
     * @returns {boolean}
     */
    canManageMember(executor, target) {
        if (!executor || !target) return false;
        if (this.isOwner(executor.user.id)) return true;
        if (executor.id === target.id) return false;
        if (target.id === executor.guild.ownerId) return false;
        
        return executor.roles.highest.position > target.roles.highest.position;
    }

    /**
     * Check if bot can manage a role (role hierarchy)
     * @param {Guild} guild - Discord guild
     * @param {Role} role - Target role
     * @returns {boolean}
     */
    canManageRole(guild, role) {
        if (!guild || !role) return false;
        const botMember = guild.members.cache.get(guild.client.user.id);
        if (!botMember) return false;
        
        return botMember.roles.highest.position > role.position;
    }
}

// Export singleton instance
module.exports = new PermissionChecker();
