/**
 * Input Validator Utility
 * Provides validation functions untuk user inputs
 */

class InputValidator {
    /**
     * Validate Discord ID format
     * @param {string} id - Discord ID to validate
     * @returns {boolean}
     */
    isValidDiscordId(id) {
        if (!id || typeof id !== 'string') return false;
        return /^\d{17,19}$/.test(id);
    }

    /**
     * Validate number input
     * @param {any} value - Value to validate
     * @param {Object} options - Validation options
     * @returns {Object} { valid: boolean, error: string, value: number }
     */
    validateNumber(value, options = {}) {
        const {
            min = -Infinity,
            max = Infinity,
            integer = false,
            positive = false
        } = options;

        const num = Number(value);

        if (isNaN(num)) {
            return { valid: false, error: 'Input harus berupa angka', value: null };
        }

        if (integer && !Number.isInteger(num)) {
            return { valid: false, error: 'Input harus berupa bilangan bulat', value: null };
        }

        if (positive && num < 0) {
            return { valid: false, error: 'Input harus berupa angka positif', value: null };
        }

        if (num < min) {
            return { valid: false, error: `Input minimal ${min}`, value: null };
        }

        if (num > max) {
            return { valid: false, error: `Input maksimal ${max}`, value: null };
        }

        return { valid: true, error: null, value: num };
    }

    /**
     * Validate string input
     * @param {any} value - Value to validate
     * @param {Object} options - Validation options
     * @returns {Object} { valid: boolean, error: string, value: string }
     */
    validateString(value, options = {}) {
        const {
            minLength = 0,
            maxLength = Infinity,
            allowEmpty = false,
            pattern = null,
            trim = true
        } = options;

        if (value === null || value === undefined) {
            return { valid: false, error: 'Input tidak boleh kosong', value: null };
        }

        let str = String(value);
        if (trim) str = str.trim();

        if (!allowEmpty && str.length === 0) {
            return { valid: false, error: 'Input tidak boleh kosong', value: null };
        }

        if (str.length < minLength) {
            return { valid: false, error: `Input minimal ${minLength} karakter`, value: null };
        }

        if (str.length > maxLength) {
            return { valid: false, error: `Input maksimal ${maxLength} karakter`, value: null };
        }

        if (pattern && !pattern.test(str)) {
            return { valid: false, error: 'Format input tidak valid', value: null };
        }

        return { valid: true, error: null, value: str };
    }

    /**
     * Sanitize string untuk embed descriptions
     * @param {string} input - String to sanitize
     * @param {number} maxLength - Maximum length
     * @returns {string} Sanitized string
     */
    sanitizeForEmbed(input, maxLength = 2000) {
        if (!input) return '';
        
        return String(input)
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/`{3,}/g, '``') // Prevent code block injection
            .substring(0, maxLength);
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean}
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Validate hex color code
     * @param {string} color - Color code to validate
     * @returns {boolean}
     */
    isValidHexColor(color) {
        if (!color || typeof color !== 'string') return false;
        return /^#?[0-9A-Fa-f]{6}$/.test(color);
    }

    /**
     * Validate time duration string (e.g., "1h", "30m", "1d")
     * @param {string} duration - Duration string
     * @returns {Object} { valid: boolean, milliseconds: number, error: string }
     */
    validateDuration(duration) {
        if (!duration || typeof duration !== 'string') {
            return { valid: false, milliseconds: 0, error: 'Format durasi tidak valid' };
        }

        const match = duration.match(/^(\d+)([smhd])$/i);
        if (!match) {
            return { valid: false, milliseconds: 0, error: 'Format durasi harus seperti: 30s, 5m, 2h, 1d' };
        }

        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        const multipliers = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000
        };

        const milliseconds = value * multipliers[unit];

        if (milliseconds < 1000) {
            return { valid: false, milliseconds: 0, error: 'Durasi minimal 1 detik' };
        }

        if (milliseconds > 365 * 24 * 60 * 60 * 1000) {
            return { valid: false, milliseconds: 0, error: 'Durasi maksimal 1 tahun' };
        }

        return { valid: true, milliseconds, error: null };
    }

    /**
     * Validate array input
     * @param {any} value - Value to validate
     * @param {Object} options - Validation options
     * @returns {Object} { valid: boolean, error: string, value: Array }
     */
    validateArray(value, options = {}) {
        const {
            minLength = 0,
            maxLength = Infinity,
            itemValidator = null
        } = options;

        if (!Array.isArray(value)) {
            return { valid: false, error: 'Input harus berupa array', value: null };
        }

        if (value.length < minLength) {
            return { valid: false, error: `Array minimal ${minLength} item`, value: null };
        }

        if (value.length > maxLength) {
            return { valid: false, error: `Array maksimal ${maxLength} item`, value: null };
        }

        if (itemValidator) {
            for (let i = 0; i < value.length; i++) {
                const result = itemValidator(value[i], i);
                if (!result.valid) {
                    return { valid: false, error: `Item ${i + 1}: ${result.error}`, value: null };
                }
            }
        }

        return { valid: true, error: null, value };
    }

    /**
     * Validate mention format
     * @param {string} mention - Mention string
     * @returns {Object} { valid: boolean, id: string, type: string }
     */
    parseMention(mention) {
        if (!mention || typeof mention !== 'string') {
            return { valid: false, id: null, type: null };
        }

        // User mention: <@123456789>
        let match = mention.match(/^<@!?(\d{17,19})>$/);
        if (match) {
            return { valid: true, id: match[1], type: 'user' };
        }

        // Role mention: <@&123456789>
        match = mention.match(/^<@&(\d{17,19})>$/);
        if (match) {
            return { valid: true, id: match[1], type: 'role' };
        }

        // Channel mention: <#123456789>
        match = mention.match(/^<#(\d{17,19})>$/);
        if (match) {
            return { valid: true, id: match[1], type: 'channel' };
        }

        return { valid: false, id: null, type: null };
    }

    /**
     * Escape markdown characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeMarkdown(text) {
        if (!text) return '';
        return String(text).replace(/([*_`~\\|])/g, '\\$1');
    }

    /**
     * Validate and parse boolean input
     * @param {any} value - Value to parse
     * @returns {Object} { valid: boolean, value: boolean }
     */
    parseBoolean(value) {
        if (typeof value === 'boolean') {
            return { valid: true, value };
        }

        if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            if (['true', 'yes', 'y', '1', 'on', 'enable'].includes(lower)) {
                return { valid: true, value: true };
            }
            if (['false', 'no', 'n', '0', 'off', 'disable'].includes(lower)) {
                return { valid: true, value: false };
            }
        }

        return { valid: false, value: null };
    }

    /**
     * Validate date string
     * @param {string} dateStr - Date string to validate
     * @returns {Object} { valid: boolean, date: Date, error: string }
     */
    validateDate(dateStr) {
        if (!dateStr) {
            return { valid: false, date: null, error: 'Tanggal tidak boleh kosong' };
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return { valid: false, date: null, error: 'Format tanggal tidak valid' };
        }

        return { valid: true, date, error: null };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Remove dangerous characters from input
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized input
     */
    sanitizeInput(input) {
        if (!input) return '';
        
        return String(input)
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }
}

// Export singleton instance
module.exports = new InputValidator();
