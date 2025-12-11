const config = require('../config');

// Get level roles from config, filtering out null values
function getLevelRoles() {
    const levelRoles = {};
    for (const [level, roleId] of Object.entries(config.roles.level)) {
        if (roleId) {
            levelRoles[level] = roleId;
        }
    }
    return levelRoles;
}

async function updateLevelRole(member, level) {
    try {
        const LEVEL_ROLES = getLevelRoles();
        
        // Find the highest role the user should have based on their level
        let highestRoleLevel = 0;
        for (const [roleLevel, roleId] of Object.entries(LEVEL_ROLES)) {
            if (level >= parseInt(roleLevel) && parseInt(roleLevel) > highestRoleLevel) {
                highestRoleLevel = parseInt(roleLevel);
            }
        }

        // Remove any level roles they shouldn't have and add the ones they should
        for (const [roleLevel, roleId] of Object.entries(LEVEL_ROLES)) {
            const role = member.guild.roles.cache.get(roleId);
            if (!role) continue;

            const hasRole = member.roles.cache.has(roleId);
            const shouldHaveRole = parseInt(roleLevel) <= level;

            if (shouldHaveRole && !hasRole) {
                await member.roles.add(role);
            } else if (!shouldHaveRole && hasRole) {
                await member.roles.remove(role);
            }
        }

        return true;
    } catch (error) {
        console.error('Error updating level roles:', error);
        return false;
    }
}

module.exports = {
    getLevelRoles,
    updateLevelRole
};