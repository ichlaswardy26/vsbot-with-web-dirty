/**
 * Level Utilities
 * Functions for XP and leveling calculations
 */

// Milestone levels for tier achievements
const MILESTONE_LEVELS = [11, 20, 30, 40, 50];

// Tier names by level
const TIER_NAMES = {
    50: 'Seraphix Ω',
    40: 'Seraphim',
    30: 'Eldritch',
    20: 'Sovereign',
    11: 'Soulborne'
};

/**
 * Get XP requirement for a specific level
 * @param {number} level - Target level
 * @returns {number} XP required to reach that level
 */
function getXpRequirement(level) {
    if (level <= 0) {
        return 0;
    }
    
    const xpToReachLevel1 = 1000;
    const xpToReachLevel10 = xpToReachLevel1 + 9 * 1000;
    const xpToReachLevel20 = xpToReachLevel10 + (10 * 3000);
    const xpToReachLevel30 = xpToReachLevel20 + (10 * 9000);
    const xpToReachLevel40 = xpToReachLevel30 + (10 * 27000);
    const xpToReachLevel50 = xpToReachLevel40 + (10 * 81000);
    const xpToReachLevel60 = xpToReachLevel50 + (10 * 243000);

    let xpRequired = 0;

    if (level === 1) {
        xpRequired = xpToReachLevel1;
    } else if (level <= 10) {
        xpRequired = xpToReachLevel1 + (level - 1) * 1000;
    } else if (level <= 20) {
        xpRequired = xpToReachLevel10 + (level - 10) * 3000;
    } else if (level <= 30) {
        xpRequired = xpToReachLevel20 + (level - 20) * 9000;
    } else if (level <= 40) {
        xpRequired = xpToReachLevel30 + (level - 30) * 27000;
    } else if (level <= 50) {
        xpRequired = xpToReachLevel40 + (level - 40) * 81000;
    } else if (level <= 60) {
        xpRequired = xpToReachLevel50 + (level - 50) * 243000;
    } else {
        // For levels above 60, continue with same multiplier
        xpRequired = xpToReachLevel60 + (level - 60) * 243000;
    }

    return xpRequired;
}

/**
 * Calculate XP per 5 hours for voice activity
 * @returns {number} XP amount
 */
function getVoiceXpPer5Hours() {
    return 1000;
}

/**
 * Calculate XP for a message
 * @param {string} messageContent - Message content
 * @returns {number} XP amount (15-25 range, with bonus for longer messages)
 */
function getMessageXp(messageContent) {
    // Base XP between 15-25
    const minXp = 15;
    const maxXp = 25;
    
    // Base random XP
    let xp = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
    
    // Bonus XP for longer, meaningful messages (up to 5 extra XP)
    if (typeof messageContent === 'string' && messageContent.length > 50) {
        const bonusXp = Math.min(5, Math.floor(messageContent.length / 100));
        xp += bonusXp;
    }
    
    return xp;
}

/**
 * Calculate level from total XP
 * @param {number} totalXp - Total XP amount
 * @returns {number} Current level
 */
function calculateLevel(totalXp) {
    if (totalXp <= 0) return 1;
    
    let level = 1;
    let xpNeeded = getXpRequirement(level);
    
    while (totalXp >= xpNeeded && level < 100) {
        level++;
        xpNeeded = getXpRequirement(level);
    }
    
    return level;
}

/**
 * Get progress percentage to next level
 * @param {number} currentXp - Current XP in level
 * @param {number} level - Current level
 * @returns {number} Progress percentage (0-100)
 */
function getProgressToNextLevel(currentXp, level) {
    const requirement = getXpRequirement(level);
    if (requirement <= 0) return 0;
    
    const progress = (currentXp / requirement) * 100;
    return Math.min(100, Math.max(0, progress));
}

/**
 * Get tier name for a level
 * @param {number} level - Level to check
 * @returns {string|null} Tier name or null if no tier
 */
function getTierName(level) {
    if (level >= 50) return 'Seraphix Ω';
    if (level >= 40) return 'Seraphim';
    if (level >= 30) return 'Eldritch';
    if (level >= 20) return 'Sovereign';
    if (level >= 11) return 'Soulborne';
    return null;
}

/**
 * Check if level is a milestone level
 * @param {number} level - Level to check
 * @returns {boolean} True if milestone level
 */
function isMilestoneLevel(level) {
    return MILESTONE_LEVELS.includes(level);
}

/**
 * Get all milestone levels
 * @returns {number[]} Array of milestone levels
 */
function getMilestoneLevels() {
    return [...MILESTONE_LEVELS];
}

/**
 * Calculate XP needed for next level
 * @param {number} currentXp - Current total XP
 * @param {number} level - Current level
 * @returns {number} XP needed for next level
 */
function getXpToNextLevel(currentXp, level) {
    const requirement = getXpRequirement(level);
    return Math.max(0, requirement - currentXp);
}

/**
 * Get voice XP per minute
 * @returns {number} XP per minute in voice
 */
function getVoiceXpPerMinute() {
    return 10;
}

module.exports = {
    getXpRequirement,
    getVoiceXpPer5Hours,
    getMessageXp,
    calculateLevel,
    getProgressToNextLevel,
    getTierName,
    isMilestoneLevel,
    getMilestoneLevels,
    getXpToNextLevel,
    getVoiceXpPerMinute,
    MILESTONE_LEVELS,
    TIER_NAMES
};