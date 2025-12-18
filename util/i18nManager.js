/**
 * Internationalization (i18n) Manager - Indonesian Only
 * Simplified version without multi-language support
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class I18nManager {
    constructor() {
        this.messages = new Map();
        this.defaultLanguage = 'id';
        this.localesPath = path.join(__dirname, '..', 'locales');
        
        // Load Indonesian language file
        this.loadLanguage();
    }

    /**
     * Load Indonesian language file
     */
    loadLanguage() {
        try {
            const filePath = path.join(this.localesPath, 'id.json');
            
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.messages = this.flattenMessages(data);
                console.log('[i18n] Bahasa Indonesia berhasil dimuat');
            } else {
                console.warn('[i18n] File id.json tidak ditemukan, menggunakan default');
                this.initializeDefaults();
            }
        } catch (error) {
            console.error('[i18n] Error loading language:', error);
            this.initializeDefaults();
        }
    }

    /**
     * Flatten nested messages object
     */
    flattenMessages(obj, prefix = '') {
        const messages = new Map();
        
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const nested = this.flattenMessages(value, fullKey);
                for (const [nestedKey, nestedValue] of nested) {
                    messages.set(nestedKey, nestedValue);
                }
            } else if (typeof value === 'string') {
                messages.set(fullKey, value);
            }
        }
        
        return messages;
    }

    /**
     * Initialize default messages
     */
    initializeDefaults() {
        this.messages = new Map([
            ['common.loading', '⏳ **|** Memproses...'],
            ['common.success', '✅ **|** Berhasil!'],
            ['common.error', '❌ **|** Terjadi kesalahan.'],
            ['common.invalid_input', '❌ **|** Input tidak valid.'],
            ['common.no_permission', '❌ **|** Kamu tidak memiliki izin untuk melakukan ini.'],
            ['common.feature_disabled', '❌ **|** Fitur ini sedang dinonaktifkan.'],
        ]);
    }

    /**
     * Get translated message
     * @param {string} key - Message key (dot notation)
     * @param {Object} options - Options object
     * @returns {string} Translated message
     */
    t(key, options = {}) {
        const { vars = {} } = options;
        
        let message = this.messages.get(key);
        
        if (!message) {
            logger.log('WARN', 'I18N', `Missing translation: ${key}`);
            return key;
        }
        
        return this.replaceVariables(message, vars);
    }

    /**
     * Replace variables in message
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
     * Reload language file
     */
    reloadLanguage() {
        this.loadLanguage();
    }

    /**
     * Get available languages (Indonesian only)
     */
    getAvailableLanguages() {
        return [{
            code: 'id',
            name: 'Bahasa Indonesia',
            nativeName: 'Bahasa Indonesia',
            flag: '🇮🇩'
        }];
    }

    /**
     * Check if language is supported
     */
    isLanguageSupported(language) {
        return language === 'id';
    }

    /**
     * Get language (always returns 'id')
     */
    getLanguage() {
        return 'id';
    }

    /**
     * Format duration to Indonesian string
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} hari`;
        if (hours > 0) return `${hours} jam`;
        if (minutes > 0) return `${minutes} menit`;
        return `${seconds} detik`;
    }
}

// Export singleton instance
module.exports = new I18nManager();
