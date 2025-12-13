const logger = require('./logger');
const config = require('../config');

/**
 * Permission Inheritance System
 * Allows creating permission groups and inheritance hierarchies
 */

class PermissionInheritance {
    constructor() {
        // Define permission groups
        this.permissionGroups = {
            // Management groups
            'server-manager': {
                permissions: ['admin', 'staff', 'moderator', 'economy', 'giveaway', 'ticket', 'shop'],
                description: 'Full server management access',
                inherits: []
            },
            'content-manager': {
                permissions: ['staff', 'moderator', 'giveaway', 'ticket'],
                description: 'Content and community management',
                inherits: []
            },
            'economy-manager': {
                permissions: ['economy', 'shop'],
                description: 'Economy and shop management',
                inherits: []
            },
            'event-organizer': {
                permissions: ['giveaway', 'ticket'],
                description: 'Event and giveaway management',
                inherits: []
            },
            'support-staff': {
                permissions: ['ticket', 'moderator'],
                description: 'Support and moderation',
                inherits: []
            },
            
            // Specialized groups
            'community-moderator': {
                permissions: ['moderator'],
                description: 'Basic moderation permissions',
                inherits: []
            },
            'shop-assistant': {
                permissions: ['shop'],
                description: 'Shop management only',
                inherits: []
            },
            'event-assistant': {
                permissions: ['giveaway'],
                description: 'Giveaway management only',
                inherits: []
            },
            
            // Hierarchical groups
            'senior-staff': {
                permissions: ['staff'],
                description: 'Senior staff member',
                inherits: ['content-manager', 'support-staff']
            },
            'junior-staff': {
                permissions: [],
                description: 'Junior staff member',
                inherits: ['community-moderator', 'event-assistant']
            },
            
            // Custom role groups
            'premium-manager': {
                permissions: ['customRole'],
                description: 'Custom role management for premium users',
                inherits: []
            },
            'boost-manager': {
                permissions: ['customRole'],
                description: 'Custom role management for boosters',
                inherits: []
            }
        };

        // User group assignments
        this.userGroups = new Map(); // userId-guildId -> [groupNames]
        
        // Role-based group assignments
        this.roleGroups = new Map(); // roleId -> [groupNames]
        
        this.initializeDefaultRoleGroups();
    }

    /**
     * Initialize default role group mappings
     */
    initializeDefaultRoleGroups() {
        // Map Discord roles to permission groups
        const roleGroupMappings = {
            [config.roles?.admin]: ['server-manager'],
            [config.roles?.staff]: ['senior-staff'],
            [config.roles?.moderator]: ['content-manager'],
            [config.roles?.eventOrganizer]: ['event-organizer'],
            [config.roles?.supportTeam]: ['support-staff'],
            [config.roles?.helper]: ['junior-staff']
        };

        for (const [roleId, groups] of Object.entries(roleGroupMappings)) {
            if (roleId && roleId !== 'null') {
                this.roleGroups.set(roleId, groups);
            }
        }
    }

    /**
     * Get all permissions for a user including inherited ones
     * @param {GuildMember} member - Discord guild member
     * @returns {Array} Array of all permissions
     */
    getUserPermissions(member) {
        if (!member) return [];

        const allPermissions = new Set();
        
        // Get permissions from user groups
        const userKey = `${member.user.id}-${member.guild.id}`;
        const userGroups = this.userGroups.get(userKey) || [];
        
        for (const groupName of userGroups) {
            const permissions = this.getGroupPermissions(groupName);
            permissions.forEach(perm => allPermissions.add(perm));
        }
        
        // Get permissions from role groups
        for (const role of member.roles.cache.values()) {
            const roleGroups = this.roleGroups.get(role.id) || [];
            for (const groupName of roleGroups) {
                const permissions = this.getGroupPermissions(groupName);
                permissions.forEach(perm => allPermissions.add(perm));
            }
        }
        
        return Array.from(allPermissions);
    }

    /**
     * Get all permissions for a permission group including inherited ones
     * @param {string} groupName - Permission group name
     * @param {Set} visited - Set of visited groups (for circular reference detection)
     * @returns {Array} Array of permissions
     */
    getGroupPermissions(groupName, visited = new Set()) {
        if (!this.permissionGroups[groupName] || visited.has(groupName)) {
            return [];
        }
        
        visited.add(groupName);
        const group = this.permissionGroups[groupName];
        const permissions = new Set(group.permissions);
        
        // Add inherited permissions
        for (const inheritedGroup of group.inherits) {
            const inheritedPermissions = this.getGroupPermissions(inheritedGroup, visited);
            inheritedPermissions.forEach(perm => permissions.add(perm));
        }
        
        return Array.from(permissions);
    }

    /**
     * Check if user has permission through groups
     * @param {GuildMember} member - Discord guild member
     * @param {string} permission - Permission to check
     * @returns {boolean} Whether user has permission
     */
    hasPermissionThroughGroups(member, permission) {
        const userPermissions = this.getUserPermissions(member);
        return userPermissions.includes(permission);
    }

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
        try {
            if (!this.permissionGroups[groupName]) {
                return { success: false, error: 'Invalid permission group' };
            }

            const userKey = `${userId}-${guildId}`;
            const currentGroups = this.userGroups.get(userKey) || [];
            
            if (currentGroups.includes(groupName)) {
                return { success: false, error: 'User already has this permission group' };
            }

            const newGroups = [...currentGroups, groupName];
            this.userGroups.set(userKey, newGroups);

            // Log the assignment
            await logger.log('INFO', 'PERMISSION_INHERITANCE', 
                `Permission group '${groupName}' assigned to user ${userId}`,
                { userId, guildId, groupName, assignedBy, reason, permissions: this.getGroupPermissions(groupName) }
            );

            return {
                success: true,
                groupName,
                permissions: this.getGroupPermissions(groupName),
                allUserGroups: newGroups
            };

        } catch (error) {
            await logger.logError(error, 'assigning permission group to user');
            return { success: false, error: error.message };
        }
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
        try {
            const userKey = `${userId}-${guildId}`;
            const currentGroups = this.userGroups.get(userKey) || [];
            
            if (!currentGroups.includes(groupName)) {
                return { success: false, error: 'User does not have this permission group' };
            }

            const newGroups = currentGroups.filter(g => g !== groupName);
            
            if (newGroups.length === 0) {
                this.userGroups.delete(userKey);
            } else {
                this.userGroups.set(userKey, newGroups);
            }

            // Log the removal
            await logger.log('INFO', 'PERMISSION_INHERITANCE', 
                `Permission group '${groupName}' removed from user ${userId}`,
                { userId, guildId, groupName, removedBy, reason }
            );

            return {
                success: true,
                removedGroup: groupName,
                remainingGroups: newGroups
            };

        } catch (error) {
            await logger.logError(error, 'removing permission group from user');
            return { success: false, error: error.message };
        }
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
        try {
            if (!this.permissionGroups[groupName]) {
                return { success: false, error: 'Invalid permission group' };
            }

            const currentGroups = this.roleGroups.get(roleId) || [];
            
            if (currentGroups.includes(groupName)) {
                return { success: false, error: 'Role already has this permission group' };
            }

            const newGroups = [...currentGroups, groupName];
            this.roleGroups.set(roleId, newGroups);

            // Log the assignment
            await logger.log('INFO', 'PERMISSION_INHERITANCE', 
                `Permission group '${groupName}' assigned to role ${roleId}`,
                { roleId, groupName, assignedBy, reason, permissions: this.getGroupPermissions(groupName) }
            );

            return {
                success: true,
                groupName,
                permissions: this.getGroupPermissions(groupName),
                allRoleGroups: newGroups
            };

        } catch (error) {
            await logger.logError(error, 'assigning permission group to role');
            return { success: false, error: error.message };
        }
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
        try {
            const currentGroups = this.roleGroups.get(roleId) || [];
            
            if (!currentGroups.includes(groupName)) {
                return { success: false, error: 'Role does not have this permission group' };
            }

            const newGroups = currentGroups.filter(g => g !== groupName);
            
            if (newGroups.length === 0) {
                this.roleGroups.delete(roleId);
            } else {
                this.roleGroups.set(roleId, newGroups);
            }

            // Log the removal
            await logger.log('INFO', 'PERMISSION_INHERITANCE', 
                `Permission group '${groupName}' removed from role ${roleId}`,
                { roleId, groupName, removedBy, reason }
            );

            return {
                success: true,
                removedGroup: groupName,
                remainingGroups: newGroups
            };

        } catch (error) {
            await logger.logError(error, 'removing permission group from role');
            return { success: false, error: error.message };
        }
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
    async createPermissionGroup(groupName, permissions, inherits = [], description = '', createdBy) {
        try {
            if (this.permissionGroups[groupName]) {
                return { success: false, error: 'Permission group already exists' };
            }

            // Validate permissions
            const validPermissions = ['admin', 'staff', 'moderator', 'economy', 'giveaway', 'ticket', 'shop', 'customRole'];
            const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
            
            if (invalidPerms.length > 0) {
                return { success: false, error: `Invalid permissions: ${invalidPerms.join(', ')}` };
            }

            // Validate inheritance
            const invalidInherits = inherits.filter(g => !this.permissionGroups[g]);
            if (invalidInherits.length > 0) {
                return { success: false, error: `Invalid inherited groups: ${invalidInherits.join(', ')}` };
            }

            // Create group
            this.permissionGroups[groupName] = {
                permissions,
                inherits,
                description,
                createdBy,
                createdAt: Date.now(),
                custom: true
            };

            // Log the creation
            await logger.log('INFO', 'PERMISSION_INHERITANCE', 
                `Custom permission group '${groupName}' created`,
                { groupName, permissions, inherits, description, createdBy }
            );

            return {
                success: true,
                groupName,
                permissions: this.getGroupPermissions(groupName),
                directPermissions: permissions,
                inherits
            };

        } catch (error) {
            await logger.logError(error, 'creating permission group');
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete custom permission group
     * @param {string} groupName - Group name
     * @param {string} deletedBy - User ID who deleted the group
     * @returns {Object} Deletion result
     */
    async deletePermissionGroup(groupName, deletedBy) {
        try {
            const group = this.permissionGroups[groupName];
            
            if (!group) {
                return { success: false, error: 'Permission group not found' };
            }

            if (!group.custom) {
                return { success: false, error: 'Cannot delete built-in permission group' };
            }

            // Check if group is being used
            const usedByUsers = Array.from(this.userGroups.values()).some(groups => groups.includes(groupName));
            const usedByRoles = Array.from(this.roleGroups.values()).some(groups => groups.includes(groupName));
            const inheritedBy = Object.values(this.permissionGroups).some(g => g.inherits.includes(groupName));

            if (usedByUsers || usedByRoles || inheritedBy) {
                return { success: false, error: 'Cannot delete group that is currently in use' };
            }

            // Delete group
            delete this.permissionGroups[groupName];

            // Log the deletion
            await logger.log('INFO', 'PERMISSION_INHERITANCE', 
                `Custom permission group '${groupName}' deleted`,
                { groupName, deletedBy }
            );

            return { success: true, deletedGroup: groupName };

        } catch (error) {
            await logger.logError(error, 'deleting permission group');
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user's permission groups
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @returns {Array} Array of group names
     */
    getUserGroups(userId, guildId) {
        const userKey = `${userId}-${guildId}`;
        return this.userGroups.get(userKey) || [];
    }

    /**
     * Get role's permission groups
     * @param {string} roleId - Role ID
     * @returns {Array} Array of group names
     */
    getRoleGroups(roleId) {
        return this.roleGroups.get(roleId) || [];
    }

    /**
     * Get all available permission groups
     * @returns {Object} All permission groups
     */
    getAllGroups() {
        return { ...this.permissionGroups };
    }

    /**
     * Get permission group details
     * @param {string} groupName - Group name
     * @returns {Object|null} Group details
     */
    getGroupDetails(groupName) {
        const group = this.permissionGroups[groupName];
        if (!group) return null;

        return {
            name: groupName,
            description: group.description,
            directPermissions: group.permissions,
            inherits: group.inherits,
            allPermissions: this.getGroupPermissions(groupName),
            custom: group.custom || false,
            createdBy: group.createdBy,
            createdAt: group.createdAt
        };
    }

    /**
     * Get inheritance tree for a group
     * @param {string} groupName - Group name
     * @param {number} depth - Current depth (for formatting)
     * @returns {Array} Inheritance tree
     */
    getInheritanceTree(groupName, depth = 0) {
        const group = this.permissionGroups[groupName];
        if (!group) return [];

        const tree = [{
            name: groupName,
            depth,
            permissions: group.permissions,
            description: group.description
        }];

        for (const inheritedGroup of group.inherits) {
            tree.push(...this.getInheritanceTree(inheritedGroup, depth + 1));
        }

        return tree;
    }

    /**
     * Get statistics about permission inheritance
     * @returns {Object} Statistics
     */
    getStatistics() {
        const totalGroups = Object.keys(this.permissionGroups).length;
        const customGroups = Object.values(this.permissionGroups).filter(g => g.custom).length;
        const builtInGroups = totalGroups - customGroups;
        
        const usersWithGroups = this.userGroups.size;
        const rolesWithGroups = this.roleGroups.size;
        
        const groupUsage = {};
        for (const groups of this.userGroups.values()) {
            groups.forEach(group => {
                groupUsage[group] = (groupUsage[group] || 0) + 1;
            });
        }
        
        for (const groups of this.roleGroups.values()) {
            groups.forEach(group => {
                groupUsage[group] = (groupUsage[group] || 0) + 1;
            });
        }

        return {
            totalGroups,
            customGroups,
            builtInGroups,
            usersWithGroups,
            rolesWithGroups,
            groupUsage,
            mostUsedGroup: Object.keys(groupUsage).reduce((a, b) => 
                groupUsage[a] > groupUsage[b] ? a : b, null
            )
        };
    }
}

// Export singleton instance
module.exports = new PermissionInheritance();