const { PermissionsBitField } = require('discord.js');
const config = require('../config');
const permissionChecker = require('./permissionChecker');
const temporaryPermissions = require('./temporaryPermissions');
const permissionInheritance = require('./permissionInheritance');
// const logger = require('./logger');

/**
 * Role Permission Utility
 * Standardized permission checking for different command categories
 */

class RolePermissions {
    /**
     * Check if user has admin permissions (Owner, Admin role, or Administrator permission)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    isAdmin(member) {
        if (!member) return false;
        
        // Check if user is bot owner
        if (permissionChecker.isOwner(member.user.id)) return true;
        
        // Check if user has Administrator permission
        if (permissionChecker.hasPermission(member, PermissionsBitField.Flags.Administrator)) return true;
        
        // Check if user has admin role
        const adminRoleId = config.roles?.admin;
        if (adminRoleId && permissionChecker.hasRole(member, adminRoleId)) return true;
        
        // Check temporary permissions
        if (temporaryPermissions.hasTemporaryPermission(member.user.id, member.guild.id, 'admin')) return true;
        
        // Check inherited permissions
        if (permissionInheritance.hasPermissionThroughGroups(member, 'admin')) return true;
        
        return false;
    }

    /**
     * Check if user has staff permissions (Staff role or higher)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    isStaff(member) {
        if (!member) return false;
        
        // Admin automatically has staff permissions
        if (this.isAdmin(member)) return true;
        
        // Check staff role
        const staffRoleId = config.roles?.staff || config.staffRoleId;
        if (staffRoleId && permissionChecker.hasRole(member, staffRoleId)) return true;
        
        // Check temporary permissions
        if (temporaryPermissions.hasTemporaryPermission(member.user.id, member.guild.id, 'staff')) return true;
        
        // Check inherited permissions
        if (permissionInheritance.hasPermissionThroughGroups(member, 'staff')) return true;
        
        return false;
    }

    /**
     * Check if user has moderator permissions (Moderator role or higher)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    isModerator(member) {
        if (!member) return false;
        
        // Staff automatically has moderator permissions
        if (this.isStaff(member)) return true;
        
        // Check moderator role
        const moderatorRoleId = config.roles?.moderator;
        if (moderatorRoleId && permissionChecker.hasRole(member, moderatorRoleId)) return true;
        
        // Check if user has moderation permissions
        if (permissionChecker.hasPermission(member, PermissionsBitField.Flags.ManageMessages) ||
            permissionChecker.hasPermission(member, PermissionsBitField.Flags.KickMembers) ||
            permissionChecker.hasPermission(member, PermissionsBitField.Flags.BanMembers)) {
            return true;
        }
        
        // Check temporary permissions
        if (temporaryPermissions.hasTemporaryPermission(member.user.id, member.guild.id, 'moderator')) return true;
        
        // Check inherited permissions
        if (permissionInheritance.hasPermissionThroughGroups(member, 'moderator')) return true;
        
        return false;
    }

    /**
     * Check if user can manage economy (Admin or specific economy manager role)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    canManageEconomy(member) {
        if (!member) return false;
        
        // Admin can manage economy
        if (this.isAdmin(member)) return true;
        
        // Check if user has ManageGuild permission (for economy commands)
        if (permissionChecker.hasPermission(member, PermissionsBitField.Flags.ManageGuild)) return true;
        
        // Check temporary permissions
        if (temporaryPermissions.hasTemporaryPermission(member.user.id, member.guild.id, 'economy')) return true;
        
        // Check inherited permissions
        if (permissionInheritance.hasPermissionThroughGroups(member, 'economy')) return true;
        
        return false;
    }

    /**
     * Check if user can manage giveaways (Staff or ManageMessages permission)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    canManageGiveaways(member) {
        if (!member) return false;
        
        // Staff can manage giveaways
        if (this.isStaff(member)) return true;
        
        // Check if user has ManageMessages permission
        if (permissionChecker.hasPermission(member, PermissionsBitField.Flags.ManageMessages)) return true;
        
        // Check event organizer role
        const eventOrganizerRoleId = config.roles?.eventOrganizer;
        if (eventOrganizerRoleId && permissionChecker.hasRole(member, eventOrganizerRoleId)) return true;
        
        // Check temporary permissions
        if (temporaryPermissions.hasTemporaryPermission(member.user.id, member.guild.id, 'giveaway')) return true;
        
        // Check inherited permissions
        if (permissionInheritance.hasPermissionThroughGroups(member, 'giveaway')) return true;
        
        return false;
    }

    /**
     * Check if user can manage tickets (Staff role)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    canManageTickets(member) {
        if (!member) return false;
        
        // Staff can manage tickets
        if (this.isStaff(member)) return true;
        
        // Check support team role
        const supportTeamRoleId = config.roles?.supportTeam;
        if (supportTeamRoleId && permissionChecker.hasRole(member, supportTeamRoleId)) return true;
        
        // Check temporary permissions
        if (temporaryPermissions.hasTemporaryPermission(member.user.id, member.guild.id, 'ticket')) return true;
        
        // Check inherited permissions
        if (permissionInheritance.hasPermissionThroughGroups(member, 'ticket')) return true;
        
        return false;
    }

    /**
     * Check if user can manage shop (Admin only)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    canManageShop(member) {
        if (!member) return false;
        
        // Admin can manage shop
        if (this.isAdmin(member)) return true;
        
        // Check temporary permissions
        if (temporaryPermissions.hasTemporaryPermission(member.user.id, member.guild.id, 'shop')) return true;
        
        // Check inherited permissions
        if (permissionInheritance.hasPermissionThroughGroups(member, 'shop')) return true;
        
        return false;
    }

    /**
     * Check if user has boost role
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    hasBoostRole(member) {
        if (!member) return false;
        const boostRoleId = config.roles?.boost || config.BOOST_ROLE_ID;
        return boostRoleId ? permissionChecker.hasRole(member, boostRoleId) : false;
    }

    /**
     * Check if user has donate role
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    hasDonateRole(member) {
        if (!member) return false;
        const donateRoleId = config.roles?.donate || config.DONATE_ROLE_ID;
        return donateRoleId ? permissionChecker.hasRole(member, donateRoleId) : false;
    }

    /**
     * Check if user can create custom roles (Boost or Donate role)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    canCreateCustomRole(member) {
        if (!member) return false;
        
        // Check boost or donate roles
        if (this.hasBoostRole(member) || this.hasDonateRole(member)) return true;
        
        // Check temporary permissions
        if (temporaryPermissions.hasTemporaryPermission(member.user.id, member.guild.id, 'customRole')) return true;
        
        // Check inherited permissions
        if (permissionInheritance.hasPermissionThroughGroups(member, 'customRole')) return true;
        
        return false;
    }

    /**
     * Get available custom role types for user
     * @param {GuildMember} member - Discord guild member
     * @returns {Array<string>} Array of available role types
     */
    getAvailableCustomRoleTypes(member) {
        const types = [];
        if (this.hasBoostRole(member)) types.push('boost');
        if (this.hasDonateRole(member)) types.push('donate');
        return types;
    }

    /**
     * Create standardized permission error message
     * @param {string} requiredPermission - Required permission level
     * @returns {string} Error message
     */
    createPermissionError(requiredPermission) {
        const errorMessages = {
            admin: '❌ **|** Kamu memerlukan permission **Administrator** atau role **Admin** untuk menggunakan command ini.',
            staff: '❌ **|** Kamu memerlukan role **Staff** atau lebih tinggi untuk menggunakan command ini.',
            moderator: '❌ **|** Kamu memerlukan role **Moderator** atau permission moderation untuk menggunakan command ini.',
            economy: '❌ **|** Kamu memerlukan permission **Manage Guild** atau role **Admin** untuk menggunakan command ini.',
            giveaway: '❌ **|** Kamu memerlukan role **Staff** atau permission **Manage Messages** untuk menggunakan command ini.',
            ticket: '❌ **|** Kamu memerlukan role **Staff** atau **Support Team** untuk menggunakan command ini.',
            shop: '❌ **|** Kamu memerlukan role **Admin** untuk menggunakan command ini.',
            customRole: '❌ **|** Kamu memerlukan role **Boost** atau **Donate** untuk menggunakan command ini.'
        };
        
        return errorMessages[requiredPermission] || `❌ **|** Kamu tidak memiliki izin untuk menggunakan command ini.`;
    }

    /**
     * Check permission and return error message if failed
     * @param {GuildMember} member - Discord guild member
     * @param {string} permissionType - Type of permission to check
     * @returns {string|null} Error message if permission denied, null if allowed
     */
    checkPermission(member, permissionType) {
        const permissionChecks = {
            admin: () => this.isAdmin(member),
            staff: () => this.isStaff(member),
            moderator: () => this.isModerator(member),
            economy: () => this.canManageEconomy(member),
            giveaway: () => this.canManageGiveaways(member),
            ticket: () => this.canManageTickets(member),
            shop: () => this.canManageShop(member),
            customRole: () => this.canCreateCustomRole(member)
        };

        const checkFunction = permissionChecks[permissionType];
        if (!checkFunction) {
            return 'Invalid permission type';
        }

        return checkFunction() ? null : this.createPermissionError(permissionType);
    }

    // ==================== TEMPORARY PERMISSIONS ====================

    /**
     * Grant temporary permission to user
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string|Array} permissions - Permission(s) to grant
     * @param {number|string} duration - Duration (ms or string like '1h', '30m')
     * @param {string} grantedBy - User ID who granted the permission
     * @param {string} reason - Reason for granting permission
     * @returns {Object} Grant result
     */
    async grantTemporaryPermission(userId, guildId, permissions, duration, grantedBy, reason = '') {
        return await temporaryPermissions.grantTemporaryPermission(userId, guildId, permissions, duration, grantedBy, reason);
    }

    /**
     * Revoke temporary permission from user
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string|Array} permissions - Permission(s) to revoke (optional, revokes all if not specified)
     * @param {string} revokedBy - User ID who revoked the permission
     * @param {string} reason - Reason for revoking permission
     * @returns {Object} Revoke result
     */
    async revokeTemporaryPermission(userId, guildId, permissions, revokedBy, reason = '') {
        return await temporaryPermissions.revokeTemporaryPermission(userId, guildId, permissions, revokedBy, reason);
    }

    /**
     * Get user's temporary permissions
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @returns {Object|null} Temporary permissions info
     */
    getUserTemporaryPermissions(userId, guildId) {
        return temporaryPermissions.getUserTemporaryPermissions(userId, guildId);
    }

    /**
     * Get all active temporary permissions for guild
     * @param {string} guildId - Guild ID
     * @returns {Array} Array of active temporary permissions
     */
    getAllTemporaryPermissions(guildId) {
        return temporaryPermissions.getAllTemporaryPermissions(guildId);
    }

    /**
     * Extend existing temporary permission
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {number|string} additionalDuration - Additional duration to add
     * @param {string} extendedBy - User ID who extended the permission
     * @param {string} reason - Reason for extension
     * @returns {Object} Extension result
     */
    async extendTemporaryPermission(userId, guildId, additionalDuration, extendedBy, reason = '') {
        return await temporaryPermissions.extendTemporaryPermission(userId, guildId, additionalDuration, extendedBy, reason);
    }

    // ==================== PERMISSION INHERITANCE ====================

    /**
     * Assign permission group to user
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string} groupName - Permission group name
     * @param {string} assignedBy - User ID who assigned the group
     * @param {string} reason - Reason for assignment
     * @returns {Object} Assignment result
     */
    async assignGroupToUser(userId, guildId, groupName, assignedBy, reason = '') {
        return await permissionInheritance.assignGroupToUser(userId, guildId, groupName, assignedBy, reason);
    }

    /**
     * Remove permission group from user
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @param {string} groupName - Permission group name
     * @param {string} removedBy - User ID who removed the group
     * @param {string} reason - Reason for removal
     * @returns {Object} Removal result
     */
    async removeGroupFromUser(userId, guildId, groupName, removedBy, reason = '') {
        return await permissionInheritance.removeGroupFromUser(userId, guildId, groupName, removedBy, reason);
    }

    /**
     * Assign permission group to role
     * @param {string} roleId - Role ID
     * @param {string} groupName - Permission group name
     * @param {string} assignedBy - User ID who assigned the group
     * @param {string} reason - Reason for assignment
     * @returns {Object} Assignment result
     */
    async assignGroupToRole(roleId, groupName, assignedBy, reason = '') {
        return await permissionInheritance.assignGroupToRole(roleId, groupName, assignedBy, reason);
    }

    /**
     * Remove permission group from role
     * @param {string} roleId - Role ID
     * @param {string} groupName - Permission group name
     * @param {string} removedBy - User ID who removed the group
     * @param {string} reason - Reason for removal
     * @returns {Object} Removal result
     */
    async removeGroupFromRole(roleId, groupName, removedBy, reason = '') {
        return await permissionInheritance.removeGroupFromRole(roleId, groupName, removedBy, reason);
    }

    /**
     * Create custom permission group
     * @param {string} groupName - Group name
     * @param {Array} permissions - Array of permissions
     * @param {Array} inherits - Array of groups to inherit from
     * @param {string} description - Group description
     * @param {string} createdBy - User ID who created the group
     * @returns {Object} Creation result
     */
    async createPermissionGroup(groupName, permissions, inherits, description, createdBy) {
        return await permissionInheritance.createPermissionGroup(groupName, permissions, inherits, description, createdBy);
    }

    /**
     * Delete custom permission group
     * @param {string} groupName - Group name
     * @param {string} deletedBy - User ID who deleted the group
     * @returns {Object} Deletion result
     */
    async deletePermissionGroup(groupName, deletedBy) {
        return await permissionInheritance.deletePermissionGroup(groupName, deletedBy);
    }

    /**
     * Get user's permission groups
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @returns {Array} Array of group names
     */
    getUserGroups(userId, guildId) {
        return permissionInheritance.getUserGroups(userId, guildId);
    }

    /**
     * Get role's permission groups
     * @param {string} roleId - Role ID
     * @returns {Array} Array of group names
     */
    getRoleGroups(roleId) {
        return permissionInheritance.getRoleGroups(roleId);
    }

    /**
     * Get all available permission groups
     * @returns {Object} All permission groups
     */
    getAllGroups() {
        return permissionInheritance.getAllGroups();
    }

    /**
     * Get permission group details
     * @param {string} groupName - Group name
     * @returns {Object|null} Group details
     */
    getGroupDetails(groupName) {
        return permissionInheritance.getGroupDetails(groupName);
    }

    /**
     * Get comprehensive user permissions (direct + temporary + inherited)
     * @param {GuildMember} member - Discord guild member
     * @returns {Object} Complete permission information
     */
    async getCompleteUserPermissions(member) {
        if (!member) return null;

        const userId = member.user.id;
        const guildId = member.guild.id;

        // Get direct permissions
        const directPermissions = {
            admin: this.isAdmin(member),
            staff: this.isStaff(member),
            moderator: this.isModerator(member),
            economy: this.canManageEconomy(member),
            giveaway: this.canManageGiveaways(member),
            ticket: this.canManageTickets(member),
            shop: this.canManageShop(member),
            customRole: this.canCreateCustomRole(member)
        };

        // Get temporary permissions
        const tempPermissions = temporaryPermissions.getUserTemporaryPermissions(userId, guildId);

        // Get inherited permissions
        const inheritedPermissions = permissionInheritance.getUserPermissions(member);
        const userGroups = permissionInheritance.getUserGroups(userId, guildId);

        // Get role groups
        const roleGroups = [];
        for (const role of member.roles.cache.values()) {
            const groups = permissionInheritance.getRoleGroups(role.id);
            if (groups.length > 0) {
                roleGroups.push({ roleId: role.id, roleName: role.name, groups });
            }
        }

        return {
            userId,
            guildId,
            username: member.user.username,
            displayName: member.displayName,
            directPermissions,
            temporaryPermissions: tempPermissions,
            inheritedPermissions,
            userGroups,
            roleGroups,
            allPermissions: Object.keys(directPermissions).filter(perm => directPermissions[perm])
        };
    }

    /**
     * Get permission statistics for guild
     * @param {string} guildId - Guild ID
     * @returns {Object} Permission statistics
     */
    getPermissionStatistics(guildId) {
        const tempStats = temporaryPermissions.getStatistics();
        const inheritanceStats = permissionInheritance.getStatistics();
        
        return {
            temporaryPermissions: tempStats,
            permissionInheritance: inheritanceStats,
            guildId,
            timestamp: Date.now()
        };
    }
}

// Export singleton instance
module.exports = new RolePermissions();