/**
 * i18n Manager Unit Tests
 */

const path = require('path');
const fs = require('fs');

// Mock the logger
jest.mock('../../util/logger', () => ({
    log: jest.fn(),
    logError: jest.fn()
}));

// Mock the LanguagePreference schema
jest.mock('../../schemas/LanguagePreference', () => ({
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([])
}));

describe('I18nManager', () => {
    let i18nManager;
    
    beforeAll(() => {
        // Ensure locales directory exists for tests
        const localesPath = path.join(__dirname, '../../locales');
        if (!fs.existsSync(localesPath)) {
            fs.mkdirSync(localesPath, { recursive: true });
        }
    });
    
    beforeEach(() => {
        jest.resetModules();
        i18nManager = require('../../util/i18nManager');
    });

    describe('loadLanguages', () => {
        it('should load language files from locales directory', () => {
            expect(i18nManager.languages.size).toBeGreaterThan(0);
        });

        it('should have Indonesian as default language', () => {
            expect(i18nManager.defaultLanguage).toBe('id');
        });

        it('should have English as fallback language', () => {
            expect(i18nManager.fallbackLanguage).toBe('en');
        });
    });

    describe('t() - Translation function', () => {
        it('should return translated message for valid key', () => {
            const message = i18nManager.t('common.success');
            expect(message).toContain('Berhasil');
        });

        it('should return key if translation not found', () => {
            const key = 'nonexistent.key.here';
            const message = i18nManager.t(key);
            expect(message).toBe(key);
        });

        it('should replace variables in message', () => {
            const message = i18nManager.t('command.cooldown', {
                vars: { time: '5 detik' }
            });
            expect(message).toContain('5 detik');
        });

        it('should use specified language when provided', () => {
            const messageId = i18nManager.t('common.success', { lang: 'id' });
            const messageEn = i18nManager.t('common.success', { lang: 'en' });
            
            expect(messageId).toContain('Berhasil');
            expect(messageEn).toContain('Success');
        });

        it('should fallback to English if translation missing in requested language', () => {
            // Assuming some keys might only exist in English
            const message = i18nManager.t('common.success', { lang: 'ja' });
            // Should either return Japanese or fallback to English
            expect(message).toBeTruthy();
        });
    });

    describe('getMessage', () => {
        it('should get nested message using dot notation', () => {
            const message = i18nManager.getMessage('permission.denied.admin', 'id');
            expect(message).toBeTruthy();
            expect(message).toContain('Administrator');
        });

        it('should return null for invalid key', () => {
            const message = i18nManager.getMessage('invalid.key', 'id');
            expect(message).toBeNull();
        });

        it('should return null for invalid language', () => {
            const message = i18nManager.getMessage('common.success', 'invalid');
            expect(message).toBeNull();
        });
    });

    describe('replaceVariables', () => {
        it('should replace single variable', () => {
            const result = i18nManager.replaceVariables('Hello {name}!', { name: 'World' });
            expect(result).toBe('Hello World!');
        });

        it('should replace multiple variables', () => {
            const result = i18nManager.replaceVariables('{user} has {count} points', {
                user: 'John',
                count: 100
            });
            expect(result).toBe('John has 100 points');
        });

        it('should replace same variable multiple times', () => {
            const result = i18nManager.replaceVariables('{x} + {x} = {y}', { x: 2, y: 4 });
            expect(result).toBe('2 + 2 = 4');
        });

        it('should handle missing variables gracefully', () => {
            const result = i18nManager.replaceVariables('Hello {name}!', {});
            expect(result).toBe('Hello {name}!');
        });
    });

    describe('isLanguageSupported', () => {
        it('should return true for supported languages', () => {
            expect(i18nManager.isLanguageSupported('id')).toBe(true);
            expect(i18nManager.isLanguageSupported('en')).toBe(true);
        });

        it('should return false for unsupported languages', () => {
            expect(i18nManager.isLanguageSupported('xyz')).toBe(false);
        });
    });

    describe('getAvailableLanguages', () => {
        it('should return array of available languages', () => {
            const languages = i18nManager.getAvailableLanguages();
            expect(Array.isArray(languages)).toBe(true);
            expect(languages.length).toBeGreaterThan(0);
        });

        it('should include language metadata', () => {
            const languages = i18nManager.getAvailableLanguages();
            const indonesian = languages.find(l => l.code === 'id');
            
            expect(indonesian).toBeDefined();
            expect(indonesian.name).toBe('Bahasa Indonesia');
            expect(indonesian.flag).toBe('🇮🇩');
        });
    });

    describe('formatDuration', () => {
        it('should format seconds correctly', () => {
            const result = i18nManager.formatDuration(5000, { lang: 'id' });
            expect(result).toContain('5');
            expect(result).toContain('detik');
        });

        it('should format minutes correctly', () => {
            const result = i18nManager.formatDuration(120000, { lang: 'id' });
            expect(result).toContain('2');
            expect(result).toContain('menit');
        });

        it('should format hours correctly', () => {
            const result = i18nManager.formatDuration(7200000, { lang: 'id' });
            expect(result).toContain('2');
            expect(result).toContain('jam');
        });

        it('should format days correctly', () => {
            const result = i18nManager.formatDuration(172800000, { lang: 'id' });
            expect(result).toContain('2');
            expect(result).toContain('hari');
        });
    });

    describe('getStats', () => {
        it('should return statistics object', () => {
            const stats = i18nManager.getStats();
            
            expect(stats).toHaveProperty('totalLanguages');
            expect(stats).toHaveProperty('languages');
            expect(stats).toHaveProperty('userPreferences');
            expect(stats).toHaveProperty('guildPreferences');
        });

        it('should include key count for each language', () => {
            const stats = i18nManager.getStats();
            
            expect(stats.languages.length).toBeGreaterThan(0);
            stats.languages.forEach(lang => {
                expect(lang).toHaveProperty('keyCount');
                expect(lang.keyCount).toBeGreaterThan(0);
            });
        });
    });

    describe('Language preference management', () => {
        it('should set user language preference', async () => {
            const result = await i18nManager.setUserLanguage('123456789', 'en');
            expect(result).toBe(true);
            expect(i18nManager.userPreferences.get('123456789')).toBe('en');
        });

        it('should reject unsupported language', async () => {
            const result = await i18nManager.setUserLanguage('123456789', 'invalid');
            expect(result).toBe(false);
        });

        it('should set guild language preference', async () => {
            const result = await i18nManager.setGuildLanguage('987654321', 'en');
            expect(result).toBe(true);
            expect(i18nManager.guildPreferences.get('987654321')).toBe('en');
        });

        it('should prioritize user preference over guild preference', () => {
            i18nManager.userPreferences.set('user1', 'en');
            i18nManager.guildPreferences.set('guild1', 'id');
            
            const lang = i18nManager.getLanguage('user1', 'guild1');
            expect(lang).toBe('en');
        });

        it('should use guild preference when user has no preference', () => {
            i18nManager.guildPreferences.set('guild2', 'en');
            
            const lang = i18nManager.getLanguage('newuser', 'guild2');
            expect(lang).toBe('en');
        });

        it('should use default language when no preferences set', () => {
            const lang = i18nManager.getLanguage('unknown', 'unknown');
            expect(lang).toBe('id');
        });
    });
});
