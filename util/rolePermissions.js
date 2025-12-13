const { PermissionsBitField } = require('discord.js');
const config = require('../config');
const permissionChecker = require('./permissionChecker');

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
        
        return false;
    }

    /**
     * Check if user can manage shop (Admin only)
     * @param {GuildMember} member - Discord guild member
     * @returns {boolean}
     */
    canManageShop(member) {
        return this.isAdmin(member);
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
        return this.hasBoostRole(member) || this.hasDonateRole(member);
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
}

// Export singleton instance
module.exports = new RolePermissions();