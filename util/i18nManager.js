/**
 * Enhanced Internationalization (i18n) Manager
 * Provides comprehensive multi-language support with file-based translations
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Schema for storing user/guild language preferences
const LanguagePreference = require('../schemas/LanguagePreference');

class I18nManager {
    constructor() {
        this.languages = new Map();
        this.defaultLanguage = 'id';
        this.fallbackLanguage = 'en';
        this.localesPath = path.join(__dirname, '..', 'locales');
        
        // Cache for preferences
        this.userPreferences = new Map();
        this.guildPreferences = new Map();
        
        // Load all language files
        this.loadLanguages();
    }

    /**
     * Load all language files from locales directory
     */
    loadLanguages() {
        try {
            if (!fs.existsSync(this.localesPath)) {
                fs.mkdirSync(this.localesPath, { recursive: true });
                console.log('[i18n] Created locales directory');
            }

            const files = fs.readdirSync(this.localesPath).filter(f => f.endsWith('.json'));
            
            for (const file of files) {
                const langCode = file.replace('.json', '');
                const filePath = path.join(this.localesPath, file);
                
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.languages.set(langCode, data);
                    console.log(`[i18n] Loaded language: ${langCode} (${data.meta?.nativeName || langCode})`);
                } catch (err) {
                    console.error(`[i18n] Failed to load ${file}:`, err.message);
                }
            }

            console.log(`[i18n] Loaded ${this.languages.size} language(s)`);
        } catch (error) {
            console.error('[i18n] Error loading languages:', error);
        }
    }

    /**
     * Reload all language files
     */
    reloadLanguages() {
        this.languages.clear();
        this.loadLanguages();
    }

    /**
     * Get translated message
     * @param {string} key - Message key (dot notation: "category.subcategory.key")
     * @param {Object} options - Options object
     * @param {string} options.userId - User ID for preference lookup
     * @param {string} options.guildId - Guild ID for preference lookup
     * @param {string} options.lang - Force specific language
     * @param {Object} options.vars - Variables to replace in message
     * @returns {string} Translated message
     */
    t(key, options = {}) {
        const { userId, guildId, lang, vars = {} } = options;
        
        // Determine language to use
        let language = lang || this.getLanguage(userId, guildId);
        
        // Get message
        let message = this.getMessage(key, language);
        
        // Fallback to default language if not found
        if (!message && language !== this.fallbackLanguage) {
            message = this.getMessage(key, this.fallbackLanguage);
        }
        
        // Return key if still not found
        if (!message) {
            logger.log('WARN', 'I18N', `Missing translation: ${key} for language: ${language}`);
            return key;
        }
        
        // Replace variables
        return this.replaceVariables(message, vars);
    }

    /**
     * Get message from language data using dot notation
     * @param {string} key - Message key
     * @param {string} language - Language code
     * @returns {string|null} Message or null
     */
    getMessage(key, language) {
        const langData = this.languages.get(language);
        if (!langData) return null;
        
        const keys = key.split('.');
        let value = langData;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return null;
            }
        }
        
        return typeof value === 'string' ? value : null;
    }

    /**
     * Replace variables in message
     * @param {string} message - Message with placeholders
     * @param {Object} vars - Variables to replace
     * @returns {string} Message with replaced variables
     */
    replaceVariables(message, vars) {
        let result = message;
        
        for (const [key, value] of Object.entries(vars)) {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            result = result.replace(regex, String(value));
        }
        
        return result;
    }

    /**
     * Get language for user/guild
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @returns {string} Language code
     */
    getLanguage(userId, guildId) {
        // Check user preference first
        if (userId && this.userPreferences.has(userId)) {
            return this.userPreferences.get(userId);
        }
        
        // Then check guild preference
        if (guildId && this.guildPreferences.has(guildId)) {
            return this.guildPreferences.get(guildId);
        }
        
        return this.defaultLanguage;
    }

    /**
     * Set user language preference
     * @param {string} userId - User ID
     * @param {string} language - Language code
     * @returns {Promise<boolean>} Success
     */
    async setUserLanguage(userId, language) {
        if (!this.isLanguageSupported(language)) {
            return false;
        }
        
        try {
            await LanguagePreference.findOneAndUpdate(
                { id: userId, type: 'user' },
                { language, updatedAt: new Date() },
                { upsert: true }
            );
            
            this.userPreferences.set(userId, language);
            logger.log('INFO', 'I18N', `User ${userId} language set to ${language}`);
            return true;
        } catch (error) {
            logger.logError(error, 'setting user language');
            return false;
        }
    }

    /**
     * Set guild language preference
     * @param {string} guildId - Guild ID
     * @param {string} language - Language code
     * @returns {Promise<boolean>} Success
     */
    async setGuildLanguage(guildId, language) {
        if (!this.isLanguageSupported(language)) {
            return false;
        }
        
        try {
            await LanguagePreference.findOneAndUpdate(
                { id: guildId, type: 'guild' },
                { language, updatedAt: new Date() },
                { upsert: true }
            );
            
            this.guildPreferences.set(guildId, language);
            logger.log('INFO', 'I18N', `Guild ${guildId} language set to ${language}`);
            return true;
        } catch (error) {
            logger.logError(error, 'setting guild language');
            return false;
        }
    }

    /**
     * Load preferences from database
     */
    async loadPreferences() {
        try {
            const preferences = await LanguagePreference.find({});
            
            for (const pref of preferences) {
                if (pref.type === 'user') {
                    this.userPreferences.set(pref.id, pref.language);
                } else if (pref.type === 'guild') {
                    this.guildPreferences.set(pref.id, pref.language);
                }
            }
            
            console.log(`[i18n] Loaded ${this.userPreferences.size} user preferences, ${this.guildPreferences.size} guild preferences`);
        } catch (error) {
            console.error('[i18n] Error loading preferences:', error);
        }
    }

    /**
     * Check if language is supported
     * @param {string} language - Language code
     * @returns {boolean}
     */
    isLanguageSupported(language) {
        return this.languages.has(language);
    }

    /**
     * Get list of available languages
     * @returns {Array} Array of language info objects
     */
    getAvailableLanguages() {
        const languages = [];
        
        for (const [code, data] of this.languages) {
            languages.push({
                code,
                name: data.meta?.name || code,
                nativeName: data.meta?.nativeName || code,
                flag: data.meta?.flag || '🏳️'
            });
        }
        
        return languages;
    }

    /**
     * Format duration to localized string
     * @param {number} ms - Duration in milliseconds
     * @param {Object} options - Options
     * @returns {string} Formatted duration
     */
    formatDuration(ms, options = {}) {
        const { userId, guildId, lang } = options;
        const language = lang || this.getLanguage(userId, guildId);
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return this.t('time.days', { lang: language, vars: { count: days } });
        } else if (hours > 0) {
            return this.t('time.hours', { lang: language, vars: { count: hours } });
        } else if (minutes > 0) {
            return this.t('time.minutes', { lang: language, vars: { count: minutes } });
        } else {
            return this.t('time.seconds', { lang: language, vars: { count: seconds } });
        }
    }

    /**
     * Get statistics about translations
     * @returns {Object} Statistics
     */
    getStats() {
        const stats = {
            totalLanguages: this.languages.size,
            languages: [],
            userPreferences: this.userPreferences.size,
            guildPreferences: this.guildPreferences.size
        };
        
        for (const [code, data] of this.languages) {
            const keyCount = this.countKeys(data);
            stats.languages.push({
                code,
                name: data.meta?.name || code,
                keyCount
            });
        }
        
        return stats;
    }

    /**
     * Count keys in language data
     * @param {Object} obj - Object to count keys in
     * @param {string} prefix - Current prefix
     * @returns {number} Key count
     */
    countKeys(obj, prefix = '') {
        let count = 0;
        
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'meta') continue;
            
            if (typeof value === 'object' && value !== null) {
                count += this.countKeys(value, `${prefix}${key}.`);
            } else if (typeof value === 'string') {
                count++;
            }
        }
        
        return count;
    }
}

// Export singleton instance
module.exports = new I18nManager();
