/**
 * Config Manager Unit Tests
 */

const mockData = new Map();

// Mock WebConfig schema as a constructor
jest.mock('../../schemas/WebConfig', () => {
    const MockWebConfig = function(data) {
        this.data = data;
        this.guildId = data.guildId;
        this.save = jest.fn().mockResolvedValue(this);
        this.toObject = () => this.data;
    };
    
    MockWebConfig.findOne = jest.fn().mockImplementation(({ guildId }) => {
        const data = mockData.get(guildId);
        return Promise.resolve(data ? { toObject: () => data } : null);
    });
    
    MockWebConfig.findOneAndUpdate = jest.fn().mockImplementation(({ guildId }, updates, options) => {
        let data = mockData.get(guildId) || { guildId };
        data = { ...data, ...updates };
        mockData.set(guildId, data);
        return Promise.resolve({ toObject: () => data });
    });
    
    // Helper methods for tests
    MockWebConfig.__resetMockData = () => mockData.clear();
    MockWebConfig.__setMockData = (guildId, data) => mockData.set(guildId, data);
    
    return MockWebConfig;
});

describe('ConfigManager', () => {
    let configManager;
    let WebConfig;
    
    beforeEach(() => {
        mockData.clear();
        jest.resetModules();
        WebConfig = require('../../schemas/WebConfig');
        configManager = require('../../util/configManager');
        configManager.clearAllCache();
    });

    describe('getConfig', () => {
        it('should return default config for new guild', async () => {
            const config = await configManager.getConfig('newguild123');
            
            expect(config).toBeDefined();
            expect(config.guildId).toBe('newguild123');
        });

        it('should return cached config on subsequent calls', async () => {
            await configManager.getConfig('guild1');
            await configManager.getConfig('guild1');
            
            // Should only call findOne once due to caching
            expect(WebConfig.findOne).toHaveBeenCalledTimes(1);
        });

        it('should return existing config from database', async () => {
            WebConfig.__setMockData('guild1', {
                guildId: 'guild1',
                channels: { welcome: '123456789' },
                features: { leveling: { enabled: true } }
            });
            
            const config = await configManager.getConfig('guild1');
            
            expect(config.channels.welcome).toBe('123456789');
        });
    });

    describe('updateConfig', () => {
        it('should update config in database', async () => {
            await configManager.updateConfig('guild1', {
                channels: { welcome: '999999999' }
            }, 'user123');
            
            expect(WebConfig.findOneAndUpdate).toHaveBeenCalled();
        });

        it('should clear cache after update', async () => {
            await configManager.getConfig('guild1');
            await configManager.updateConfig('guild1', { channels: {} });
            
            // Cache should be updated
            const config = await configManager.getConfig('guild1');
            expect(config).toBeDefined();
        });
    });

    describe('validateConfig', () => {
        it('should validate correct config', () => {
            const result = configManager.validateConfig({
                guildId: '123456789012345678',
                colors: { primary: '#5865F2' }
            });
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid color format', () => {
            const result = configManager.validateConfig({
                guildId: '123456789012345678',
                colors: { primary: 'invalid' }
            });
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should reject missing guildId', () => {
            const result = configManager.validateConfig({
                colors: { primary: '#5865F2' }
            });
            
            expect(result.isValid).toBe(false);
        });

        it('should reject invalid XP range', () => {
            const result = configManager.validateConfig({
                guildId: '123456789012345678',
                features: {
                    leveling: { xpMin: 50, xpMax: 25 }
                }
            });
            
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateField', () => {
        it('should validate channel ID format', () => {
            const valid = configManager.validateField('channel', '123456789012345678', 'channelId');
            const invalid = configManager.validateField('channel', 'invalid', 'channelId');
            
            expect(valid.isValid).toBe(true);
            expect(invalid.isValid).toBe(false);
        });

        it('should validate role ID format', () => {
            const valid = configManager.validateField('role', '123456789012345678', 'roleId');
            const invalid = configManager.validateField('role', 'abc', 'roleId');
            
            expect(valid.isValid).toBe(true);
            expect(invalid.isValid).toBe(false);
        });

        it('should validate color format', () => {
            const valid = configManager.validateField('color', '#FF5500', 'color');
            const invalid = configManager.validateField('color', 'red', 'color');
            
            expect(valid.isValid).toBe(true);
            expect(invalid.isValid).toBe(false);
        });

        it('should validate URL format', () => {
            const valid = configManager.validateField('url', 'https://example.com', 'url');
            const invalid = configManager.validateField('url', 'not-a-url', 'url');
            
            expect(valid.isValid).toBe(true);
            expect(invalid.isValid).toBe(false);
        });

        it('should allow empty optional fields', () => {
            const result = configManager.validateField('optional', '', 'channelId');
            expect(result.isValid).toBe(true);
        });
    });

    describe('detectConflicts', () => {
        it('should detect duplicate channel assignments', () => {
            const conflicts = configManager.detectConflicts({
                channels: {
                    welcome: '123456789012345678',
                    goodbye: '123456789012345678'
                }
            });
            
            expect(conflicts.length).toBeGreaterThan(0);
            expect(conflicts[0].type).toBe('duplicate_channel');
        });

        it('should detect feature dependencies', () => {
            const conflicts = configManager.detectConflicts({
                features: {
                    leveling: { enabled: true },
                    economy: { enabled: false }
                }
            });
            
            expect(conflicts.length).toBeGreaterThan(0);
            expect(conflicts[0].type).toBe('feature_dependency');
        });

        it('should return empty array for valid config', () => {
            const conflicts = configManager.detectConflicts({
                channels: {
                    welcome: '111111111111111111',
                    goodbye: '222222222222222222'
                },
                features: {
                    leveling: { enabled: true },
                    economy: { enabled: true }
                }
            });
            
            expect(conflicts).toHaveLength(0);
        });
    });

    describe('exportConfig', () => {
        it('should export config with metadata', async () => {
            WebConfig.__setMockData('guild1', {
                guildId: 'guild1',
                channels: { welcome: '123' },
                features: { leveling: { enabled: true } }
            });
            
            const exported = await configManager.exportConfig('guild1');
            
            expect(exported.guildId).toBe('guild1');
            expect(exported.exportedAt).toBeDefined();
            expect(exported.version).toBeDefined();
        });
    });

    describe('validateImportConfig', () => {
        it('should validate correct import config', () => {
            const result = configManager.validateImportConfig({
                channels: { welcome: '123456789012345678' },
                colors: { primary: '#5865F2' }
            });
            
            expect(result.isValid).toBe(true);
        });

        it('should reject invalid import config', () => {
            const result = configManager.validateImportConfig({
                channels: { welcome: 'invalid' }
            });
            
            expect(result.isValid).toBe(false);
        });

        it('should warn about unknown sections', () => {
            const result = configManager.validateImportConfig({
                unknownSection: { data: 'test' }
            });
            
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('clearCache', () => {
        it('should clear cache for specific guild', async () => {
            await configManager.getConfig('guild1');
            configManager.clearCache('guild1');
            
            // Next call should hit database again
            await configManager.getConfig('guild1');
            expect(WebConfig.findOne).toHaveBeenCalledTimes(2);
        });
    });

    describe('clearAllCache', () => {
        it('should clear all cached configs', async () => {
            await configManager.getConfig('guild1');
            await configManager.getConfig('guild2');
            
            configManager.clearAllCache();
            
            await configManager.getConfig('guild1');
            await configManager.getConfig('guild2');
            
            expect(WebConfig.findOne).toHaveBeenCalledTimes(4);
        });
    });
});
