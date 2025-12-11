/**
 * Cooldown Manager untuk mencegah spam commands
 * Menggunakan Map untuk menyimpan cooldown per user per command
 */

class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
    }

    /**
     * Check if user is on cooldown for a command
     * @param {string} userId - Discord user ID
     * @param {string} commandName - Command name
     * @param {number} cooldownAmount - Cooldown duration in milliseconds
     * @returns {Object} { onCooldown: boolean, timeLeft: number }
     */
    checkCooldown(userId, commandName, cooldownAmount = 3000) {
        const key = `${userId}-${commandName}`;
        const now = Date.now();

        if (this.cooldowns.has(key)) {
            const expirationTime = this.cooldowns.get(key) + cooldownAmount;
            
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return { onCooldown: true, timeLeft: timeLeft.toFixed(1) };
            }
        }

        return { onCooldown: false, timeLeft: 0 };
    }

    /**
     * Set cooldown for user and command
     * @param {string} userId - Discord user ID
     * @param {string} commandName - Command name
     * @param {number} cooldownAmount - Cooldown duration in milliseconds
     */
    setCooldown(userId, commandName, cooldownAmount = 3000) {
        const key = `${userId}-${commandName}`;
        const now = Date.now();
        
        this.cooldowns.set(key, now);
        
        // Auto cleanup after cooldown expires
        setTimeout(() => {
            this.cooldowns.delete(key);
        }, cooldownAmount);
    }

    /**
     * Remove cooldown for user and command (for admin override)
     * @param {string} userId - Discord user ID
     * @param {string} commandName - Command name
     */
    removeCooldown(userId, commandName) {
        const key = `${userId}-${commandName}`;
        this.cooldowns.delete(key);
    }

    /**
     * Clear all cooldowns (for bot restart or admin command)
     */
    clearAll() {
        this.cooldowns.clear();
    }

    /**
     * Get remaining cooldown time
     * @param {string} userId - Discord user ID
     * @param {string} commandName - Command name
     * @param {number} cooldownAmount - Cooldown duration in milliseconds
     * @returns {number} Remaining time in seconds
     */
    getRemainingTime(userId, commandName, cooldownAmount = 3000) {
        const key = `${userId}-${commandName}`;
        const now = Date.now();

        if (this.cooldowns.has(key)) {
            const expirationTime = this.cooldowns.get(key) + cooldownAmount;
            if (now < expirationTime) {
                return (expirationTime - now) / 1000;
            }
        }

        return 0;
    }

    /**
     * Format remaining time to human readable string
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds.toFixed(1)} detik`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        if (minutes < 60) {
            return `${minutes} menit ${remainingSeconds} detik`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        return `${hours} jam ${remainingMinutes} menit`;
    }
}

// Export singleton instance
module.exports = new CooldownManager();
