const logger = require('./logger');
const fs = require('fs').promises;

/**
 * Internationalization (i18n) System
 * Multi-language support for the bot
 */

class I18n {
    constructor() {
        // Language data storage
        this.languages = new Map();
        this.defaultLanguage = 'id'; // Indonesian as default
        this.fallbackLanguage = 'en'; // English as fallback
        
        // User language preferences
        this.userLanguages = new Map(); // userId -> languageCode
        this.guildLanguages = new Map(); // guildId -> languageCode
        
        // Available languages
        this.availableLanguages = {
            'id': {
                name: 'Bahasa Indonesia',
                nativeName: 'Bahasa Indonesia',
                flag: '🇮🇩',
                code: 'id'
            },
            'en': {
                name: 'English',
                nativeName: 'English',
                flag: '🇺🇸',
                code: 'en'
            },
            'ja': {
                name: 'Japanese',
                nativeName: '日本語',
                flag: '🇯🇵',
                code: 'ja'
            },
            'ko': {
                name: 'Korean',
                nativeName: '한국어',
                flag: '🇰🇷',
                code: 'ko'
            },
            'zh': {
                name: 'Chinese',
                nativeName: '中文',
                flag: '🇨🇳',
                code: 'zh'
            },
            'es': {
                name: 'Spanish',
                nativeName: 'Español',
                flag: '🇪🇸',
                code: 'es'
            },
            'fr': {
                name: 'French',
                nativeName: 'Français',
                flag: '🇫🇷',
                code: 'fr'
            },
            'de': {
                name: 'German',
                nativeName: 'Deutsch',
                flag: '🇩🇪',
                code: 'de'
            }
        };
        
        // Initialize with default messages
        this.initializeDefaultMessages();
    }

    /**
     * Initialize default messages for all languages
     */
    initializeDefaultMessages() {
        // Indonesian (Default)
        this.languages.set('id', {
            // Permission messages
            'permission.denied.admin': '❌ **|** Kamu memerlukan permission **Administrator** atau role **Admin** untuk menggunakan command ini.',
            'permission.denied.staff': '❌ **|** Kamu memerlukan role **Staff** atau lebih tinggi untuk menggunakan command ini.',
            'permission.denied.moderator': '❌ **|** Kamu memerlukan role **Moderator** atau permission moderation untuk menggunakan command ini.',
            'permission.denied.economy': '❌ **|** Kamu memerlukan permission **Manage Guild** atau role **Admin** untuk menggunakan command ini.',
            'permission.denied.giveaway': '❌ **|** Kamu memerlukan role **Staff** atau permission **Manage Messages** untuk menggunakan command ini.',
            'permission.denied.ticket': '❌ **|** Kamu memerlukan role **Staff** atau **Support Team** untuk menggunakan command ini.',
            'permission.denied.shop': '❌ **|** Kamu memerlukan role **Admin** untuk menggunakan command ini.',
            'permission.denied.customRole': '❌ **|** Kamu memerlukan role **Boost** atau **Donate** untuk menggunakan command ini.',
            
            // Command responses
            'command.success': '✅ **|** Command berhasil dijalankan.',
            'command.error': '❌ **|** Terjadi error saat menjalankan command.',
            'command.invalid': '❌ **|** Command tidak valid.',
            'command.cooldown': '⏰ **|** Kamu harus menunggu {time} sebelum menggunakan command ini lagi.',
            'command.ratelimit': '🚫 **|** Kamu telah mencapai batas penggunaan command. Coba lagi nanti.',
            
            // User messages
            'user.not_found': '❌ **|** User tidak ditemukan.',
            'user.not_in_guild': '❌ **|** User tidak ada di server ini.',
            'user.invalid': '❌ **|** User ID tidak valid.',
            
            // Role messages
            'role.not_found': '❌ **|** Role tidak ditemukan.',
            'role.invalid': '❌ **|** Role ID tidak valid.',
            'role.hierarchy': '❌ **|** Bot tidak dapat mengelola role ini karena hierarchy.',
            
            // Channel messages
            'channel.not_found': '❌ **|** Channel tidak ditemukan.',
            'channel.invalid': '❌ **|** Channel ID tidak valid.',
            'channel.no_permission': '❌ **|** Bot tidak memiliki permission di channel ini.',
            
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
        });

        // English
        this.languages.set('en', {
            // Permission messages
            'permission.denied.admin': '❌ **|** You need **Administrator** permission or **Admin** role to use this command.',
            'permission.denied.staff': '❌ **|** You need **Staff** role or higher to use this command.',
            'permission.denied.moderator': '❌ **|** You need **Moderator** role or moderation permissions to use this command.',
            'permission.denied.economy': '❌ **|** You need **Manage Guild** permission or **Admin** role to use this command.',
            'permission.denied.giveaway': '❌ **|** You need **Staff** role or **Manage Messages** permission to use this command.',
            'permission.denied.ticket': '❌ **|** You need **Staff** or **Support Team** role to use this command.',
            'permission.denied.shop': '❌ **|** You need **Admin** role to use this command.',
            'permission.denied.customRole': '❌ **|** You need **Boost** or **Donate** role to use this command.',
            
            // Command responses
            'command.success': '✅ **|** Command executed successfully.',
            'command.error': '❌ **|** An error occurred while executing the command.',
            'command.invalid': '❌ **|** Invalid command.',
            'command.cooldown': '⏰ **|** You must wait {time} before using this command again.',
            'command.ratelimit': '🚫 **|** You have reached the command usage limit. Try again later.',
            
            // User messages
            'user.not_found': '❌ **|** User not found.',
            'user.not_in_guild': '❌ **|** User is not in this server.',
            'user.invalid': '❌ **|** Invalid user ID.',
            
            // Role messages
            'role.not_found': '❌ **|** Role not found.',
            'role.invalid': '❌ **|** Invalid role ID.',
            'role.hierarchy': '❌ **|** Bot cannot manage this role due to hierarchy.',
            
            // Channel messages
            'channel.not_found': '❌ **|** Channel not found.',
            'channel.invalid': '❌ **|** Invalid channel ID.',
            'channel.no_permission': '❌ **|** Bot does not have permission in this channel.',
            
            // Temporary permissions
            'temp_perm.granted': '✅ **|** Temporary permission **{permission}** has been granted to {user} for {duration}.',
            'temp_perm.revoked': '🔒 **|** Temporary permission **{permission}** has been revoked from {user}.',
            'temp_perm.extended': '⏰ **|** Temporary permission for {user} has been extended by {duration}.',
            'temp_perm.expired': '⏰ **|** Temporary permission **{permission}** for {user} has expired.',
            'temp_perm.not_found': '❌ **|** User does not have any active temporary permissions.',
            'temp_perm.invalid_duration': '❌ **|** Invalid duration. Use format like 1h, 30m, 2d.',
            
            // Permission groups
            'perm_group.created': '✅ **|** Permission group **{group}** has been created.',
            'perm_group.deleted': '🗑️ **|** Permission group **{group}** has been deleted.',
            'perm_group.assigned': '✅ **|** Permission group **{group}** has been assigned to {target}.',
            'perm_group.removed': '🔒 **|** Permission group **{group}** has been removed from {target}.',
            'perm_group.not_found': '❌ **|** Permission group not found.',
            'perm_group.already_exists': '❌ **|** Permission group already exists.',
            'perm_group.in_use': '❌ **|** Permission group is in use and cannot be deleted.',
            
            // Context permissions
            'context_perm.set': '✅ **|** Context permissions have been set for {context}.',
            'context_perm.removed': '🗑️ **|** Context permissions have been removed from {context}.',
            'context_perm.not_found': '❌ **|** No context permissions found for {context}.',
            'context_perm.invalid_config': '❌ **|** Invalid permissions configuration.',
            
            // Analytics
            'analytics.generating': '📊 **|** Generating analytics report...',
            'analytics.generated': '✅ **|** Analytics report generated successfully.',
            'analytics.no_data': '❌ **|** No analytics data available for the selected timeframe.',
            
            // General
            'loading': '⏳ **|** Processing...',
            'success': '✅ **|** Success!',
            'error': '❌ **|** An error occurred.',
            'invalid_input': '❌ **|** Invalid input.',
            'no_permission': '❌ **|** You do not have permission to do this.',
            'feature_disabled': '❌ **|** This feature is currently disabled.',
            'maintenance': '🔧 **|** Bot is under maintenance. Please try again later.'
        });

        // Add more languages with basic translations
        this.languages.set('ja', {
            'permission.denied.admin': '❌ **|** このコマンドを使用するには**管理者**権限または**Admin**ロールが必要です。',
            'command.success': '✅ **|** コマンドが正常に実行されました。',
            'command.error': '❌ **|** コマンドの実行中にエラーが発生しました。',
            'loading': '⏳ **|** 処理中...',
            'success': '✅ **|** 成功！',
            'error': '❌ **|** エラーが発生しました。'
        });

        this.languages.set('ko', {
            'permission.denied.admin': '❌ **|** 이 명령어를 사용하려면 **관리자** 권한 또는 **Admin** 역할이 필요합니다.',
            'command.success': '✅ **|** 명령어가 성공적으로 실행되었습니다.',
            'command.error': '❌ **|** 명령어 실행 중 오류가 발생했습니다.',
            'loading': '⏳ **|** 처리 중...',
            'success': '✅ **|** 성공!',
            'error': '❌ **|** 오류가 발생했습니다.'
        });

        this.languages.set('zh', {
            'permission.denied.admin': '❌ **|** 使用此命令需要**管理员**权限或**Admin**角色。',
            'command.success': '✅ **|** 命令执行成功。',
            'command.error': '❌ **|** 执行命令时发生错误。',
            'loading': '⏳ **|** 处理中...',
            'success': '✅ **|** 成功！',
            'error': '❌ **|** 发生错误。'
        });

        this.languages.set('es', {
            'permission.denied.admin': '❌ **|** Necesitas permisos de **Administrador** o el rol **Admin** para usar este comando.',
            'command.success': '✅ **|** Comando ejecutado exitosamente.',
            'command.error': '❌ **|** Ocurrió un error al ejecutar el comando.',
            'loading': '⏳ **|** Procesando...',
            'success': '✅ **|** ¡Éxito!',
            'error': '❌ **|** Ocurrió un error.'
        });

        this.languages.set('fr', {
            'permission.denied.admin': '❌ **|** Vous avez besoin des permissions **Administrateur** ou du rôle **Admin** pour utiliser cette commande.',
            'command.success': '✅ **|** Commande exécutée avec succès.',
            'command.error': '❌ **|** Une erreur s\'est produite lors de l\'exécution de la commande.',
            'loading': '⏳ **|** Traitement en cours...',
            'success': '✅ **|** Succès !',
            'error': '❌ **|** Une erreur s\'est produite.'
        });

        this.languages.set('de', {
            'permission.denied.admin': '❌ **|** Du benötigst **Administrator**-Berechtigung oder die **Admin**-Rolle, um diesen Befehl zu verwenden.',
            'command.success': '✅ **|** Befehl erfolgreich ausgeführt.',
            'command.error': '❌ **|** Ein Fehler ist bei der Ausführung des Befehls aufgetreten.',
            'loading': '⏳ **|** Verarbeitung...',
            'success': '✅ **|** Erfolg!',
            'error': '❌ **|** Ein Fehler ist aufgetreten.'
        });
    }

    /**
     * Get translated message
     * @param {string} key - Message key
     * @param {string} userId - User ID (optional)
     * @param {string} guildId - Guild ID (optional)
     * @param {Object} variables - Variables to replace in message
     * @returns {string} Translated message
     */
    get(key, userId = null, guildId = null, variables = {}) {
        try {
            // Determine language to use
            let language = this.defaultLanguage;
            
            // Check user preference first
            if (userId && this.userLanguages.has(userId)) {
                language = this.userLanguages.get(userId);
            }
            // Then check guild preference
            else if (guildId && this.guildLanguages.has(guildId)) {
                language = this.guildLanguages.get(guildId);
            }
            
            // Get message from language
            let message = this.getMessageFromLanguage(key, language);
            
            // If not found, try fallback language
            if (!message && language !== this.fallbackLanguage) {
                message = this.getMessageFromLanguage(key, this.fallbackLanguage);
            }
            
            // If still not found, return key
            if (!message) {
                message = key;
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
     * Get message from specific language
     * @param {string} key - Message key
     * @param {string} language - Language code
     * @returns {string|null} Message or null if not found
     */
    getMessageFromLanguage(key, language) {
        const languageData = this.languages.get(language);
        if (!languageData) return null;
        
        return languageData[key] || null;
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
     * Set user language preference
     * @param {string} userId - User ID
     * @param {string} language - Language code
     * @returns {boolean} Success
     */
    setUserLanguage(userId, language) {
        try {
            if (!this.availableLanguages[language]) {
                return false;
            }
            
            this.userLanguages.set(userId, language);
            
            logger.log('INFO', 'I18N', 
                `User language preference set: ${userId} -> ${language}`
            );
            
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
     * @returns {boolean} Success
     */
    setGuildLanguage(guildId, language) {
        try {
            if (!this.availableLanguages[language]) {
                return false;
            }
            
            this.guildLanguages.set(guildId, language);
            
            logger.log('INFO', 'I18N', 
                `Guild language preference set: ${guildId} -> ${language}`
            );
            
            return true;
            
        } catch (error) {
            logger.logError(error, 'setting guild language');
            return false;
        }
    }

    /**
     * Get user language preference
     * @param {string} userId - User ID
     * @returns {string} Language code
     */
    getUserLanguage(userId) {
        return this.userLanguages.get(userId) || this.defaultLanguage;
    }

    /**
     * Get guild language preference
     * @param {string} guildId - Guild ID
     * @returns {string} Language code
     */
    getGuildLanguage(guildId) {
        return this.guildLanguages.get(guildId) || this.defaultLanguage;
    }

    /**
     * Get available languages
     * @returns {Object} Available languages
     */
    getAvailableLanguages() {
        return { ...this.availableLanguages };
    }

    /**
     * Check if language is supported
     * @param {string} language - Language code
     * @returns {boolean} Whether language is supported
     */
    isLanguageSupported(language) {
        return Object.prototype.hasOwnProperty.call(this.availableLanguages, language);
    }

    /**
     * Get language statistics
     * @returns {Object} Language usage statistics
     */
    getLanguageStatistics() {
        const stats = {
            totalUsers: this.userLanguages.size,
            totalGuilds: this.guildLanguages.size,
            userLanguages: new Map(),
            guildLanguages: new Map(),
            defaultLanguage: this.defaultLanguage,
            fallbackLanguage: this.fallbackLanguage
        };
        
        // Count user language preferences
        for (const language of this.userLanguages.values()) {
            const count = stats.userLanguages.get(language) || 0;
            stats.userLanguages.set(language, count + 1);
        }
        
        // Count guild language preferences
        for (const language of this.guildLanguages.values()) {
            const count = stats.guildLanguages.get(language) || 0;
            stats.guildLanguages.set(language, count + 1);
        }
        
        return stats;
    }

    /**
     * Load language data from file
     * @param {string} language - Language code
     * @param {string} filePath - Path to language file
     */
    async loadLanguageFromFile(language, filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const languageData = JSON.parse(data);
            
            this.languages.set(language, languageData);
            
            logger.log('INFO', 'I18N', 
                `Language data loaded from file: ${language} (${filePath})`
            );
            
        } catch (error) {
            logger.logError(error, `loading language file: ${filePath}`);
        }
    }

    /**
     * Save language data to file
     * @param {string} language - Language code
     * @param {string} filePath - Path to save file
     */
    async saveLanguageToFile(language, filePath) {
        try {
            const languageData = this.languages.get(language);
            if (!languageData) {
                throw new Error(`Language ${language} not found`);
            }
            
            const data = JSON.stringify(languageData, null, 2);
            await fs.writeFile(filePath, data, 'utf8');
            
            logger.log('INFO', 'I18N', 
                `Language data saved to file: ${language} (${filePath})`
            );
            
        } catch (error) {
            logger.logError(error, `saving language file: ${filePath}`);
        }
    }

    /**
     * Add or update message in language
     * @param {string} language - Language code
     * @param {string} key - Message key
     * @param {string} message - Message text
     */
    setMessage(language, key, message) {
        try {
            if (!this.languages.has(language)) {
                this.languages.set(language, {});
            }
            
            const languageData = this.languages.get(language);
            languageData[key] = message;
            
            logger.log('DEBUG', 'I18N', 
                `Message updated: ${language}.${key} = ${message}`
            );
            
        } catch (error) {
            logger.logError(error, 'setting message');
        }
    }

    /**
     * Remove message from language
     * @param {string} language - Language code
     * @param {string} key - Message key
     */
    removeMessage(language, key) {
        try {
            const languageData = this.languages.get(language);
            if (languageData && languageData[key]) {
                delete languageData[key];
                
                logger.log('DEBUG', 'I18N', 
                    `Message removed: ${language}.${key}`
                );
            }
            
        } catch (error) {
            logger.logError(error, 'removing message');
        }
    }
}

// Export singleton instance
module.exports = new I18n();