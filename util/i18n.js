/**
 * Internationalization (i18n) System - Indonesian Only
 * Simplified version without multi-language support
 */

const logger = require('./logger');

class I18n {
    constructor() {
        // Language data storage - Indonesian only
        this.messages = {};
        this.defaultLanguage = 'id';
        
        // Initialize with Indonesian messages
        this.initializeMessages();
    }

    /**
     * Initialize Indonesian messages
     */
    initializeMessages() {
        this.messages = {
            // Permission messages
            'permission.denied.admin': '❌ **|** Kamu memerlukan permission **Administrator** atau role **Admin** untuk menggunakan command ini.',
            'permission.denied.staff': '❌ **|** Kamu memerlukan role **Staff** atau lebih tinggi untuk menggunakan command ini.',
            'permission.denied.moderator': '❌ **|** Kamu memerlukan role **Moderator** atau permission moderation untuk menggunakan command ini.',
            'permission.denied.economy': '❌ **|** Kamu memerlukan permission **Manage Guild** atau role **Admin** untuk menggunakan command ini.',
            'permission.denied.giveaway': '❌ **|** Kamu memerlukan role **Staff** atau permission **Manage Messages** untuk menggunakan command ini.',
            'permission.denied.ticket': '❌ **|** Kamu memerlukan role **Staff** atau **Support Team** untuk menggunakan command ini.',
            'permission.denied.shop': '❌ **|** Kamu memerlukan role **Admin** untuk menggunakan command ini.',
            'permission.denied.customRole': '❌ **|** Kamu memerlukan role **Boost** atau **Donate** untuk menggunakan command ini.',
            'permission.denied.owner': '❌ **|** Hanya owner bot yang dapat menggunakan command ini.',
            
            // Command responses
            'command.success': '✅ **|** Command berhasil dijalankan.',
            'command.error': '❌ **|** Terjadi error saat menjalankan command.',
            'command.invalid': '❌ **|** Command tidak valid.',
            'command.cooldown': '⏰ **|** Kamu harus menunggu {time} sebelum menggunakan command ini lagi.',
            'command.ratelimit': '🚫 **|** Kamu telah mencapai batas penggunaan command. Coba lagi nanti.',
            'command.disabled': '❌ **|** Command ini sedang dinonaktifkan.',
            'command.guild_only': '❌ **|** Command ini hanya dapat digunakan di server.',
            
            // User messages
            'user.not_found': '❌ **|** User tidak ditemukan.',
            'user.not_in_guild': '❌ **|** User tidak ada di server ini.',
            'user.invalid': '❌ **|** User ID tidak valid.',
            'user.self_action': '❌ **|** Kamu tidak dapat melakukan aksi ini pada dirimu sendiri.',
            'user.bot_action': '❌ **|** Kamu tidak dapat melakukan aksi ini pada bot.',
            'user.higher_role': '❌ **|** Kamu tidak dapat melakukan aksi ini pada user dengan role lebih tinggi.',
            
            // Role messages
            'role.not_found': '❌ **|** Role tidak ditemukan.',
            'role.invalid': '❌ **|** Role ID tidak valid.',
            'role.hierarchy': '❌ **|** Bot tidak dapat mengelola role ini karena hierarchy.',
            'role.managed': '❌ **|** Role ini dikelola oleh integrasi dan tidak dapat dimodifikasi.',
            
            // Channel messages
            'channel.not_found': '❌ **|** Channel tidak ditemukan.',
            'channel.invalid': '❌ **|** Channel ID tidak valid.',
            'channel.no_permission': '❌ **|** Bot tidak memiliki permission di channel ini.',
            'channel.wrong_type': '❌ **|** Tipe channel tidak sesuai.',
            
            // Temporary permissions
            'temp_perm.granted': '✅ **|** Temporary permission **{permission}** telah diberikan kepada {user} selama {duration}.',
            'temp_perm.revoked': '🔒 **|** Temporary permission **{permission}** telah dicabut dari {user}.',
            'temp_perm.extended': '⏰ **|** Temporary permission untuk {user} telah diperpanjang {duration}.',
            'temp_perm.expired': '⏰ **|** Temporary permission **{permission}** untuk {user} telah kedaluwarsa.',
            'temp_perm.not_found': '❌ **|** User tidak memiliki temporary permission yang aktif.',
            'temp_perm.invalid_duration': '❌ **|** Durasi tidak valid. Gunakan format seperti 1h, 30m, 2d.',
            
            // Permission groups
            'perm_group.created': '✅ **|** Permission group **{group}** berhasil dibuat.',
            'perm_group.deleted': '🗑️ **|** Permission group **{group}** berhasil dihapus.',
            'perm_group.assigned': '✅ **|** Permission group **{group}** telah di-assign ke {target}.',
            'perm_group.removed': '🔒 **|** Permission group **{group}** telah dihapus dari {target}.',
            'perm_group.not_found': '❌ **|** Permission group tidak ditemukan.',
            'perm_group.already_exists': '❌ **|** Permission group sudah ada.',
            'perm_group.in_use': '❌ **|** Permission group sedang digunakan dan tidak dapat dihapus.',
            
            // Context permissions
            'context_perm.set': '✅ **|** Context permissions berhasil diatur untuk {context}.',
            'context_perm.removed': '🗑️ **|** Context permissions berhasil dihapus dari {context}.',
            'context_perm.not_found': '❌ **|** Tidak ada context permissions untuk {context}.',
            'context_perm.invalid_config': '❌ **|** Konfigurasi permissions tidak valid.',
            
            // Analytics
            'analytics.generating': '📊 **|** Sedang menghasilkan laporan analytics...',
            'analytics.generated': '✅ **|** Laporan analytics berhasil dihasilkan.',
            'analytics.no_data': '❌ **|** Tidak ada data analytics untuk timeframe yang dipilih.',
            
            // General
            'loading': '⏳ **|** Memproses...',
            'success': '✅ **|** Berhasil!',
            'error': '❌ **|** Terjadi kesalahan.',
            'invalid_input': '❌ **|** Input tidak valid.',
            'no_permission': '❌ **|** Kamu tidak memiliki izin untuk melakukan ini.',
            'feature_disabled': '❌ **|** Fitur ini sedang dinonaktifkan.',
            'maintenance': '🔧 **|** Bot sedang dalam maintenance. Coba lagi nanti.'
        };
    }

    /**
     * Get translated message
     * @param {string} key - Message key
     * @param {Object} variables - Variables to replace in message
     * @returns {string} Translated message
     */
    get(key, userId = null, guildId = null, variables = {}) {
        try {
            let message = this.messages[key];
            
            // If not found, return key
            if (!message) {
                return key;
            }
            
            // Replace variables
            message = this.replaceVariables(message, variables);
            
            return message;
            
        } catch (error) {
            logger.logError(error, 'getting translated message');
            return key;
        }
    }

    /**
     * Alias for get() - for compatibility
     */
    t(key, options = {}) {
        const { vars = {} } = options;
        return this.get(key, null, null, vars);
    }

    /**
     * Replace variables in message
     * @param {string} message - Message with variables
     * @param {Object} variables - Variables to replace
     * @returns {string} Message with replaced variables
     */
    replaceVariables(message, variables) {
        let result = message;
        
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }
        
        return result;
    }

    /**
     * Get available languages (Indonesian only)
     * @returns {Array} Available languages
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
     * @param {string} language - Language code
     * @returns {boolean} Whether language is supported
     */
    isLanguageSupported(language) {
        return language === 'id';
    }

    /**
     * Set message (for dynamic updates)
     * @param {string} key - Message key
     * @param {string} message - Message text
     */
    setMessage(key, message) {
        this.messages[key] = message;
    }
}

// Export singleton instance
module.exports = new I18n();
