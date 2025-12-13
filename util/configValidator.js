const { PermissionsBitField } = require('discord.js');
const config = require('../config');

/**
 * Configuration Validator Utility
 * Validates bot configuration and server setup
 */

class ConfigValidator {
    constructor() {
        this.validationResults = new Map();
    }

    /**
     * Validate if a role exists in the guild
     * @param {Guild} guild - Discord guild
     * @param {string} roleId - Role ID to validate
     * @param {string} roleName - Role name for error messages
     * @returns {Object} Validation result
     */
    async validateRoleExists(guild, roleId, roleName) {
        if (!roleId) {
            return { 
                valid: false, 
                error: `${roleName} role not configured in environment variables`,
                severity: 'warning'
            };
        }
        
        const role = guild.roles.cache.get(roleId);
        if (!role) {
            return { 
                valid: false, 
                error: `${roleName} role (${roleId}) not found in server`,
                severity: 'error'
            };
        }
        
        return { 
            valid: true, 
            role,
            message: `${roleName} role configured correctly`
        };
    }

    /**
     * Validate bot permissions in guild
     * @param {Guild} guild - Discord guild
     * @returns {Object} Validation result
     */
    async validateBotPermissions(guild) {
        const botMember = guild.members.cache.get(guild.client.user.id);
        if (!botMember) {
            return {
                valid: false,
                error: 'Bot member not found in guild',
                severity: 'critical'
            };
        }

        const requiredPermissions = [
            'ManageRoles',
            'ManageChannels', 
            'ManageMessages',
            'EmbedLinks',
            'AttachFiles',
            'UseExternalEmojis',
            'SendMessages',
            'ViewChannel',
            'ReadMessageHistory'
        ];
        
        const missing = requiredPermissions.filter(perm => 
            !botMember.permissions.has(PermissionsBitField.Flags[perm])
        );
        
        if (missing.length > 0) {
            return {
                valid: false,
                error: `Bot missing permissions: ${missing.join(', ')}`,
                severity: 'error',
                missing
            };
        }

        return { 
            valid: true, 
            message: 'Bot has all required permissions'
        };
    }

    /**
     * Validate role hierarchy (bot role position)
     * @param {Guild} guild - Discord guild
     * @returns {Object} Validation result
     */
    async validateRoleHierarchy(guild) {
        const botMember = guild.members.cache.get(guild.client.user.id);
        if (!botMember) {
            return {
                valid: false,
                error: 'Bot member not found',
                severity: 'critical'
            };
        }

        const botHighestRole = botMember.roles.highest;
        const issues = [];

        // Check if bot can manage configured roles
        const rolesToCheck = [
            { id: config.roles?.staff, name: 'Staff' },
            { id: config.roles?.admin, name: 'Admin' },
            { id: config.roles?.moderator, name: 'Moderator' },
            { id: config.roles?.boost, name: 'Boost' },
            { id: config.roles?.donate, name: 'Donate' }
        ];

        for (const roleConfig of rolesToCheck) {
            if (roleConfig.id) {
                const role = guild.roles.cache.get(roleConfig.id);
                if (role && role.position >= botHighestRole.position) {
                    issues.push(`${roleConfig.name} role is higher than or equal to bot role`);
                }
            }
        }

        if (issues.length > 0) {
            return {
                valid: false,
                error: `Role hierarchy issues: ${issues.join(', ')}`,
                severity: 'warning',
                issues
            };
        }

        return {
            valid: true,
            message: 'Role hierarchy is correct'
        };
    }

    /**
     * Validate channel configurations
     * @param {Guild} guild - Discord guild
     * @returns {Object} Validation result
     */
    async validateChannels(guild) {
        const issues = [];
        const channelsToCheck = [
            { id: config.channels?.ticketLogs, name: 'Ticket Logs' },
            { id: config.channels?.voiceLog, name: 'Voice Log' },
            { id: config.channels?.confession, name: 'Confession' },
            { id: config.channels?.donation, name: 'Donation' }
        ];

        for (const channelConfig of channelsToCheck) {
            if (channelConfig.id) {
                const channel = guild.channels.cache.get(channelConfig.id);
                if (!channel) {
                    issues.push(`${channelConfig.name} channel not found`);
                } else if (!channel.isTextBased()) {
                    issues.push(`${channelConfig.name} is not a text channel`);
                }
            }
        }

        if (issues.length > 0) {
            return {
                valid: false,
                error: `Channel issues: ${issues.join(', ')}`,
                severity: 'warning',
                issues
            };
        }

        return {
            valid: true,
            message: 'All configured channels are valid'
        };
    }

    /**
     * Validate categories
     * @param {Guild} guild - Discord guild
     * @returns {Object} Validation result
     */
    async validateCategories(guild) {
        const issues = [];
        const categoriesToCheck = [
            { id: config.categories?.ticket, name: 'Ticket Category' },
            { id: config.categories?.partner, name: 'Partner Category' }
        ];

        for (const categoryConfig of categoriesToCheck) {
            if (categoryConfig.id) {
                const category = guild.channels.cache.get(categoryConfig.id);
                if (!category) {
                    issues.push(`${categoryConfig.name} not found`);
                } else if (category.type !== 4) { // CategoryChannel type
                    issues.push(`${categoryConfig.name} is not a category`);
                }
            }
        }

        if (issues.length > 0) {
            return {
                valid: false,
                error: `Category issues: ${issues.join(', ')}`,
                severity: 'warning',
                issues
            };
        }

        return {
            valid: true,
            message: 'All configured categories are valid'
        };
    }

    /**
     * Run comprehensive validation
     * @param {Guild} guild - Discord guild
     * @returns {Object} Complete validation results
     */
    async validateAll(guild) {
        const results = {
            overall: true,
            timestamp: new Date(),
            guild: {
                id: guild.id,
                name: guild.name
            },
            validations: {}
        };

        try {
            // Validate bot permissions
            results.validations.botPermissions = await this.validateBotPermissions(guild);
            if (!results.validations.botPermissions.valid) {
                results.overall = false;
            }

            // Validate role hierarchy
            results.validations.roleHierarchy = await this.validateRoleHierarchy(guild);
            if (!results.validations.roleHierarchy.valid && results.validations.roleHierarchy.severity === 'error') {
                results.overall = false;
            }

            // Validate individual roles
            const rolesToValidate = [
                { id: config.roles?.staff, name: 'Staff' },
                { id: config.roles?.admin, name: 'Admin' },
                { id: config.roles?.moderator, name: 'Moderator' },
                { id: config.roles?.boost, name: 'Boost' },
                { id: config.roles?.donate, name: 'Donate' },
                { id: config.roles?.supportTeam, name: 'Support Team' }
            ];

            results.validations.roles = {};
            for (const roleConfig of rolesToValidate) {
                const validation = await this.validateRoleExists(guild, roleConfig.id, roleConfig.name);
                results.validations.roles[roleConfig.name.toLowerCase().replace(' ', '')] = validation;
                
                if (!validation.valid && validation.severity === 'error') {
                    results.overall = false;
                }
            }

            // Validate channels
            results.validations.channels = await this.validateChannels(guild);

            // Validate categories
            results.validations.categories = await this.validateCategories(guild);

            // Store results for caching
            this.validationResults.set(guild.id, results);

        } catch (error) {
            results.overall = false;
            results.error = error.message;
        }

        return results;
    }

    /**
     * Get cached validation results
     * @param {string} guildId - Guild ID
     * @returns {Object|null} Cached results or null
     */
    getCachedResults(guildId) {
        const cached = this.validationResults.get(guildId);
        if (!cached) return null;

        // Check if cache is older than 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (cached.timestamp < fiveMinutesAgo) {
            this.validationResults.delete(guildId);
            return null;
        }

        return cached;
    }

    /**
     * Create validation report embed
     * @param {Object} results - Validation results
     * @returns {Object} Discord embed object
     */
    createValidationReport(results) {
        const { EmbedBuilder } = require('discord.js');
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Bot Configuration Validation')
            .setColor(results.overall ? '#57F287' : '#ED4245')
            .setTimestamp()
            .setFooter({ text: `Guild: ${results.guild.name}` });

        // Overall status
        embed.addFields({
            name: '📊 Overall Status',
            value: results.overall ? '✅ All critical validations passed' : '❌ Some validations failed',
            inline: false
        });

        // Bot permissions
        if (results.validations.botPermissions) {
            const perm = results.validations.botPermissions;
            embed.addFields({
                name: '🤖 Bot Permissions',
                value: perm.valid ? '✅ All permissions granted' : `❌ ${perm.error}`,
                inline: true
            });
        }

        // Role hierarchy
        if (results.validations.roleHierarchy) {
            const hier = results.validations.roleHierarchy;
            embed.addFields({
                name: '📊 Role Hierarchy',
                value: hier.valid ? '✅ Hierarchy correct' : `⚠️ ${hier.error}`,
                inline: true
            });
        }

        // Role validations
        if (results.validations.roles) {
            const roleStatus = [];
            for (const [roleName, validation] of Object.entries(results.validations.roles)) {
                const icon = validation.valid ? '✅' : (validation.severity === 'error' ? '❌' : '⚠️');
                roleStatus.push(`${icon} ${roleName}`);
            }
            
            embed.addFields({
                name: '👥 Role Configuration',
                value: roleStatus.join('\n') || 'No roles configured',
                inline: true
            });
        }

        return embed;
    }
}

// Export singleton instance
module.exports = new ConfigValidator();