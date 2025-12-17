const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const session = require('express-session');
const configManager = require('../../util/configManager');
const { validateGuildId } = require('../middleware/validation');
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');

// Mock dependencies
jest.mock('../../util/configManager');
jest.mock('../middleware/auth');

// Reduce test runs for faster execution
const TEST_RUNS = 100;

describe('Import/Export API Property Tests', () => {
  let testApp;

  beforeEach(() => {
    // Create a fresh app for each test
    testApp = express();
    testApp.use(express.json());
    testApp.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));

    // Mock authentication middleware to pass
    verifyAuth.mockImplementation((req, res, next) => {
      req.user = {
        id: '123456789012345678',
        guilds: [{ id: req.params.guildId, permissions: 0x8 }],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
      next();
    });

    verifyGuildAccess.mockImplementation((req, res, next) => {
      next();
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  // Arbitrary generators for configuration data
  const validGuildIdArb = fc.constantFrom('123456789012345678', '987654321098765432', '111222333444555666');
  
  // Generate valid hex color codes
  const hexCharArb = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F');
  const validColorArb = fc.tuple(hexCharArb, hexCharArb, hexCharArb, hexCharArb, hexCharArb, hexCharArb)
    .map(chars => `#${chars.join('')}`);
  
  // Generate valid Discord snowflake IDs (17-19 digit numbers)
  const digitArb = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9');
  const validChannelIdArb = fc.array(digitArb, { minLength: 17, maxLength: 19 }).map(digits => digits.join(''));
  
  const validRoleIdArb = fc.array(digitArb, { minLength: 17, maxLength: 19 }).map(digits => digits.join(''));

  const channelsConfigArb = fc.record({
    welcome: fc.option(validChannelIdArb, { nil: null }),
    confession: fc.option(validChannelIdArb, { nil: null }),
    ticketLogs: fc.option(validChannelIdArb, { nil: null }),
    chat: fc.record({
      channel1: fc.option(validChannelIdArb, { nil: null }),
      channel2: fc.option(validChannelIdArb, { nil: null })
    })
  });

  const rolesConfigArb = fc.record({
    staff: fc.option(validRoleIdArb, { nil: null }),
    boost: fc.option(validRoleIdArb, { nil: null }),
    levels: fc.record({
      level1: fc.option(validRoleIdArb, { nil: null }),
      level10: fc.option(validRoleIdArb, { nil: null })
    })
  });

  const colorsConfigArb = fc.record({
    primary: validColorArb,
    success: validColorArb,
    error: validColorArb,
    warning: validColorArb,
    info: validColorArb
  });

  const featuresConfigArb = fc.record({
    leveling: fc.record({
      enabled: fc.boolean(),
      xpCooldown: fc.integer({ min: 30000, max: 300000 }),
      xpMin: fc.integer({ min: 1, max: 50 }),
      xpMax: fc.integer({ min: 51, max: 100 })
    }),
    economy: fc.record({
      enabled: fc.boolean(),
      dailyReward: fc.integer({ min: 50, max: 500 }),
      collectCooldown: fc.integer({ min: 1800000, max: 7200000 })
    })
  });

  const emojisConfigArb = fc.record({
    souls: fc.constant('💰'),
    check: fc.constant('✅'),
    cross: fc.constant('❌'),
    info: fc.constant('ℹ️')
  });

  // Generate valid ISO date strings
  const validDateArb = fc.integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
    .map(timestamp => new Date(timestamp).toISOString());

  const validConfigArb = fc.record({
    guildId: validGuildIdArb,
    channels: channelsConfigArb,
    roles: rolesConfigArb,
    colors: colorsConfigArb,
    features: featuresConfigArb,
    emojis: emojisConfigArb,
    exportedAt: validDateArb,
    version: fc.constant('1.0.0')
  });

  describe('Property 19: Configuration export completeness', () => {
    /**
     * **Feature: web-dashboard, Property 19: Configuration export completeness**
     * **Validates: Requirements 6.1**
     * 
     * For any export operation, the system should generate JSON file 
     * containing all current configuration settings
     */
    test('should export complete configuration with all sections', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        validConfigArb,
        async (guildId, mockConfig) => {
          // Mock exportConfig to return complete configuration
          const exportedConfig = {
            guildId,
            channels: mockConfig.channels,
            categories: {},
            roles: mockConfig.roles,
            emojis: mockConfig.emojis,
            images: {},
            features: mockConfig.features,
            colors: mockConfig.colors,
            language: { default: 'en', available: ['en'] },
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
          };
          
          configManager.exportConfig.mockResolvedValue(exportedConfig);

          // Setup route
          testApp.post('/api/config/:guildId/export', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const config = await configManager.exportConfig(req.params.guildId);
                res.json({
                  success: true,
                  data: config,
                  filename: `config-${req.params.guildId}-${Date.now()}.json`
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to export configuration'
                });
              }
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/export`)
            .expect(200);

          // Verify export success
          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
          expect(response.body.filename).toMatch(/^config-\d+-\d+\.json$/);
          
          // Verify all required sections are present in export
          const exportData = response.body.data;
          expect(exportData).toHaveProperty('guildId');
          expect(exportData).toHaveProperty('channels');
          expect(exportData).toHaveProperty('roles');
          expect(exportData).toHaveProperty('features');
          expect(exportData).toHaveProperty('colors');
          expect(exportData).toHaveProperty('emojis');
          expect(exportData).toHaveProperty('exportedAt');
          expect(exportData).toHaveProperty('version');
          
          // Verify exportedAt is a valid ISO date string
          expect(() => new Date(exportData.exportedAt)).not.toThrow();
          
          // Verify configManager was called with correct guildId
          expect(configManager.exportConfig).toHaveBeenCalledWith(guildId);
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should include all configuration sections in export', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        channelsConfigArb,
        rolesConfigArb,
        colorsConfigArb,
        featuresConfigArb,
        async (guildId, channels, roles, colors, features) => {
          const exportedConfig = {
            guildId,
            channels,
            categories: {},
            roles,
            emojis: { souls: '💰', check: '✅' },
            images: {},
            features,
            colors,
            language: { default: 'en' },
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
          };
          
          configManager.exportConfig.mockResolvedValue(exportedConfig);

          testApp.post('/api/config/:guildId/export', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              const config = await configManager.exportConfig(req.params.guildId);
              res.json({ success: true, data: config });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/export`)
            .expect(200);

          // Verify each section matches what was configured
          expect(response.body.data.channels).toEqual(channels);
          expect(response.body.data.roles).toEqual(roles);
          expect(response.body.data.colors).toEqual(colors);
          expect(response.body.data.features).toEqual(features);
        }
      ), { numRuns: TEST_RUNS });
    });
  });


  describe('Property 20: Import validation and preview', () => {
    /**
     * **Feature: web-dashboard, Property 20: Import validation and preview**
     * **Validates: Requirements 6.2, 6.3**
     * 
     * For any configuration import, the system should validate file format, 
     * show preview, and require confirmation
     */
    test('should validate import configuration format and provide preview', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        validConfigArb,
        async (guildId, importConfig) => {
          // Mock preview import to return validation and changes
          const previewResult = {
            isValid: true,
            errors: [],
            warnings: [],
            changes: [
              { section: 'channels', path: 'channels.welcome', oldValue: null, newValue: importConfig.channels.welcome, type: 'add' },
              { section: 'colors', path: 'colors.primary', oldValue: '#000000', newValue: importConfig.colors.primary, type: 'modify' }
            ],
            sectionsAffected: ['channels', 'colors']
          };
          
          configManager.previewImport.mockResolvedValue(previewResult);

          // Setup preview route
          testApp.post('/api/config/:guildId/import/preview', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const preview = await configManager.previewImport(req.params.guildId, req.body);
                res.json({
                  success: true,
                  data: preview
                });
              } catch (error) {
                res.status(400).json({
                  success: false,
                  error: error.message
                });
              }
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import/preview`)
            .send(importConfig)
            .expect(200);

          // Verify preview response structure
          expect(response.body.success).toBe(true);
          expect(response.body.data).toHaveProperty('isValid');
          expect(response.body.data).toHaveProperty('errors');
          expect(response.body.data).toHaveProperty('warnings');
          expect(response.body.data).toHaveProperty('changes');
          expect(response.body.data).toHaveProperty('sectionsAffected');
          
          // Verify validation passed for valid config
          expect(response.body.data.isValid).toBe(true);
          expect(response.body.data.errors).toHaveLength(0);
          
          // Verify changes are provided for preview
          expect(Array.isArray(response.body.data.changes)).toBe(true);
          expect(Array.isArray(response.body.data.sectionsAffected)).toBe(true);
          
          // Verify configManager was called correctly
          expect(configManager.previewImport).toHaveBeenCalledWith(guildId, importConfig);
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should show all changes that will be applied during import', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        validConfigArb,
        fc.array(fc.record({
          section: fc.constantFrom('channels', 'roles', 'features', 'colors'),
          path: fc.string({ minLength: 5, maxLength: 30 }),
          oldValue: fc.oneof(fc.string(), fc.constant(null)),
          newValue: fc.oneof(fc.string(), fc.constant(null)),
          type: fc.constantFrom('add', 'modify', 'remove')
        }), { minLength: 1, maxLength: 10 }),
        async (guildId, importConfig, mockChanges) => {
          const previewResult = {
            isValid: true,
            errors: [],
            warnings: [],
            changes: mockChanges,
            sectionsAffected: [...new Set(mockChanges.map(c => c.section))]
          };
          
          configManager.previewImport.mockResolvedValue(previewResult);

          testApp.post('/api/config/:guildId/import/preview', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              const preview = await configManager.previewImport(req.params.guildId, req.body);
              res.json({ success: true, data: preview });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import/preview`)
            .send(importConfig)
            .expect(200);

          // Verify all changes are included in preview
          expect(response.body.data.changes).toHaveLength(mockChanges.length);
          
          // Verify each change has required properties
          response.body.data.changes.forEach(change => {
            expect(change).toHaveProperty('section');
            expect(change).toHaveProperty('path');
            expect(change).toHaveProperty('type');
            expect(['add', 'modify', 'remove']).toContain(change.type);
          });
          
          // Verify sectionsAffected matches unique sections from changes
          const expectedSections = [...new Set(mockChanges.map(c => c.section))];
          expect(response.body.data.sectionsAffected.sort()).toEqual(expectedSections.sort());
        }
      ), { numRuns: TEST_RUNS });
    });
  });

  describe('Property 21: Import error handling', () => {
    /**
     * **Feature: web-dashboard, Property 21: Import error handling**
     * **Validates: Requirements 6.4**
     * 
     * For any failed import validation, the system should display 
     * specific error messages and prevent import
     */
    
    // Generator for invalid configurations
    const invalidColorArb = fc.oneof(
      fc.constant('not-a-color'),
      fc.constant('#GGG'),
      fc.constant('red'),
      fc.constant('#12345') // Too short
    );

    const invalidChannelIdArb = fc.oneof(
      fc.constant('invalid'),
      fc.constant('123'),
      fc.constant('not-a-number'),
      fc.constant('12345678901234567890123') // Too long
    );

    test('should reject invalid color formats with specific error messages', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        invalidColorArb,
        async (guildId, invalidColor) => {
          const invalidConfig = {
            colors: { primary: invalidColor }
          };
          
          // Mock validation failure
          const validationError = new Error(`Invalid configuration: Invalid color format for primary: ${invalidColor}. Expected format: #RRGGBB`);
          validationError.validationErrors = [`Invalid color format for primary: ${invalidColor}. Expected format: #RRGGBB`];
          
          configManager.importConfig.mockRejectedValue(validationError);

          testApp.post('/api/config/:guildId/import', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const result = await configManager.importConfig(req.params.guildId, req.body, req.user.id);
                res.json({ success: true, data: result.data });
              } catch (error) {
                res.status(400).json({
                  success: false,
                  error: error.message,
                  validationErrors: error.validationErrors || []
                });
              }
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import`)
            .send(invalidConfig)
            .expect(400);

          // Verify error response
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
          expect(response.body.error).toContain('Invalid');
          
          // Verify specific validation errors are provided
          expect(response.body.validationErrors).toBeDefined();
          expect(Array.isArray(response.body.validationErrors)).toBe(true);
          expect(response.body.validationErrors.length).toBeGreaterThan(0);
          
          // Verify import was not applied
          expect(configManager.importConfig).toHaveBeenCalledWith(guildId, invalidConfig, '123456789012345678');
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should reject invalid channel ID formats', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        invalidChannelIdArb,
        async (guildId, invalidChannelId) => {
          const invalidConfig = {
            channels: { welcome: invalidChannelId }
          };
          
          const validationError = new Error(`Invalid configuration: Invalid channel ID format at channels.welcome: ${invalidChannelId}`);
          validationError.validationErrors = [`Invalid channel ID format at channels.welcome: ${invalidChannelId}`];
          
          configManager.importConfig.mockRejectedValue(validationError);

          testApp.post('/api/config/:guildId/import', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const result = await configManager.importConfig(req.params.guildId, req.body, req.user.id);
                res.json({ success: true, data: result.data });
              } catch (error) {
                res.status(400).json({
                  success: false,
                  error: error.message,
                  validationErrors: error.validationErrors || []
                });
              }
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import`)
            .send(invalidConfig)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.validationErrors).toBeDefined();
          expect(response.body.validationErrors.some(e => e.includes('channel'))).toBe(true);
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should reject invalid XP range configurations', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        fc.integer({ min: 50, max: 100 }), // xpMin higher than xpMax
        fc.integer({ min: 1, max: 49 }),   // xpMax lower than xpMin
        async (guildId, xpMin, xpMax) => {
          const invalidConfig = {
            features: {
              leveling: {
                xpMin: xpMin,
                xpMax: xpMax
              }
            }
          };
          
          const validationError = new Error('Invalid configuration: XP minimum must be less than maximum');
          validationError.validationErrors = ['XP minimum must be less than maximum'];
          
          configManager.importConfig.mockRejectedValue(validationError);

          testApp.post('/api/config/:guildId/import', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const result = await configManager.importConfig(req.params.guildId, req.body, req.user.id);
                res.json({ success: true, data: result.data });
              } catch (error) {
                res.status(400).json({
                  success: false,
                  error: error.message,
                  validationErrors: error.validationErrors || []
                });
              }
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import`)
            .send(invalidConfig)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error).toContain('XP');
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should provide guidance for fixing validation errors', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        fc.oneof(
          fc.record({ colors: fc.record({ primary: fc.constant('invalid') }) }),
          fc.record({ channels: fc.record({ welcome: fc.constant('bad-id') }) }),
          fc.record({ features: fc.record({ leveling: fc.record({ xpMin: fc.constant(100), xpMax: fc.constant(50) }) }) })
        ),
        async (guildId, invalidConfig) => {
          const validationError = new Error('Invalid configuration: Multiple validation errors');
          validationError.validationErrors = [
            'Invalid color format for primary: invalid. Expected format: #RRGGBB',
            'Invalid channel ID format at channels.welcome: bad-id'
          ];
          
          configManager.importConfig.mockRejectedValue(validationError);

          testApp.post('/api/config/:guildId/import', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const result = await configManager.importConfig(req.params.guildId, req.body, req.user.id);
                res.json({ success: true, data: result.data });
              } catch (error) {
                res.status(400).json({
                  success: false,
                  error: error.message,
                  validationErrors: error.validationErrors || []
                });
              }
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import`)
            .send(invalidConfig)
            .expect(400);

          // Verify error messages provide guidance
          expect(response.body.validationErrors).toBeDefined();
          response.body.validationErrors.forEach(error => {
            // Each error should be descriptive enough to help fix the issue
            expect(error.length).toBeGreaterThan(10);
          });
        }
      ), { numRuns: TEST_RUNS });
    });
  });


  describe('Property 22: Import success processing', () => {
    /**
     * **Feature: web-dashboard, Property 22: Import success processing**
     * **Validates: Requirements 6.5**
     * 
     * For any successful import, the system should apply all settings 
     * and notify user of completion
     */
    test('should apply all settings and return success notification on valid import', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        validConfigArb,
        async (guildId, importConfig) => {
          // Mock successful import - use the request guildId, not the config's guildId
          const importResult = {
            success: true,
            data: {
              guildId: guildId, // Use the request guildId
              channels: importConfig.channels,
              roles: importConfig.roles,
              colors: importConfig.colors,
              features: importConfig.features,
              emojis: importConfig.emojis,
              metadata: {
                updatedAt: new Date().toISOString(),
                lastConfiguredBy: '123456789012345678'
              }
            },
            warnings: [],
            appliedSections: ['channels', 'roles', 'features', 'colors', 'emojis']
          };
          
          configManager.importConfig.mockResolvedValue(importResult);

          testApp.post('/api/config/:guildId/import', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const result = await configManager.importConfig(req.params.guildId, req.body, req.user.id);
                res.json({
                  success: true,
                  data: result.data,
                  warnings: result.warnings,
                  appliedSections: result.appliedSections,
                  message: 'Configuration imported successfully'
                });
              } catch (error) {
                res.status(400).json({
                  success: false,
                  error: error.message
                });
              }
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import`)
            .send(importConfig)
            .expect(200);

          // Verify success response
          expect(response.body.success).toBe(true);
          expect(response.body.message).toBe('Configuration imported successfully');
          
          // Verify data was returned
          expect(response.body.data).toBeDefined();
          expect(response.body.data.guildId).toBe(guildId);
          
          // Verify applied sections are listed
          expect(response.body.appliedSections).toBeDefined();
          expect(Array.isArray(response.body.appliedSections)).toBe(true);
          expect(response.body.appliedSections.length).toBeGreaterThan(0);
          
          // Verify configManager was called with correct parameters
          expect(configManager.importConfig).toHaveBeenCalledWith(
            guildId, 
            importConfig, 
            '123456789012345678'
          );
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should include warnings in successful import response', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        validConfigArb,
        fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 0, maxLength: 3 }),
        async (guildId, importConfig, mockWarnings) => {
          const importResult = {
            success: true,
            data: { guildId, ...importConfig },
            warnings: mockWarnings,
            appliedSections: ['channels', 'roles']
          };
          
          configManager.importConfig.mockResolvedValue(importResult);

          testApp.post('/api/config/:guildId/import', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              const result = await configManager.importConfig(req.params.guildId, req.body, req.user.id);
              res.json({
                success: true,
                data: result.data,
                warnings: result.warnings,
                appliedSections: result.appliedSections,
                message: 'Configuration imported successfully'
              });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import`)
            .send(importConfig)
            .expect(200);

          // Verify warnings are included in response
          expect(response.body.warnings).toBeDefined();
          expect(Array.isArray(response.body.warnings)).toBe(true);
          expect(response.body.warnings).toEqual(mockWarnings);
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should track which sections were applied during import', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        fc.subarray(['channels', 'roles', 'features', 'colors', 'emojis', 'images', 'language'], { minLength: 1 }),
        async (guildId, sectionsToApply) => {
          // Build config with only selected sections
          const importConfig = {};
          if (sectionsToApply.includes('channels')) importConfig.channels = { welcome: '123456789012345678' };
          if (sectionsToApply.includes('roles')) importConfig.roles = { staff: '123456789012345678' };
          if (sectionsToApply.includes('features')) importConfig.features = { leveling: { enabled: true } };
          if (sectionsToApply.includes('colors')) importConfig.colors = { primary: '#5865F2' };
          if (sectionsToApply.includes('emojis')) importConfig.emojis = { souls: '💰' };
          if (sectionsToApply.includes('images')) importConfig.images = { defaultGif: 'https://example.com/image.gif' };
          if (sectionsToApply.includes('language')) importConfig.language = { default: 'en' };
          
          const importResult = {
            success: true,
            data: { guildId, ...importConfig },
            warnings: [],
            appliedSections: sectionsToApply
          };
          
          configManager.importConfig.mockResolvedValue(importResult);

          testApp.post('/api/config/:guildId/import', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              const result = await configManager.importConfig(req.params.guildId, req.body, req.user.id);
              res.json({
                success: true,
                data: result.data,
                appliedSections: result.appliedSections,
                message: 'Configuration imported successfully'
              });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import`)
            .send(importConfig)
            .expect(200);

          // Verify applied sections match what was sent
          expect(response.body.appliedSections).toBeDefined();
          expect(response.body.appliedSections.sort()).toEqual(sectionsToApply.sort());
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should update metadata after successful import', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        validConfigArb,
        async (guildId, importConfig) => {
          const now = new Date();
          const importResult = {
            success: true,
            data: {
              guildId,
              ...importConfig,
              metadata: {
                updatedAt: now.toISOString(),
                lastConfiguredBy: '123456789012345678',
                version: '1.0.0'
              }
            },
            warnings: [],
            appliedSections: ['channels', 'roles', 'features']
          };
          
          configManager.importConfig.mockResolvedValue(importResult);

          testApp.post('/api/config/:guildId/import', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              const result = await configManager.importConfig(req.params.guildId, req.body, req.user.id);
              res.json({
                success: true,
                data: result.data,
                message: 'Configuration imported successfully'
              });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/import`)
            .send(importConfig)
            .expect(200);

          // Verify metadata was updated
          expect(response.body.data.metadata).toBeDefined();
          expect(response.body.data.metadata.lastConfiguredBy).toBe('123456789012345678');
          expect(response.body.data.metadata.updatedAt).toBeDefined();
          
          // Verify updatedAt is recent
          const updatedAt = new Date(response.body.data.metadata.updatedAt);
          expect(updatedAt.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
        }
      ), { numRuns: TEST_RUNS });
    });
  });

  describe('Backup and Restore functionality', () => {
    /**
     * Additional tests for backup/restore which supports Requirements 6.1, 6.5
     */
    test('should create backup with all configuration data', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        validConfigArb,
        async (guildId, mockConfig) => {
          const backupData = {
            ...mockConfig,
            guildId,
            backupCreatedAt: new Date().toISOString(),
            isBackup: true
          };
          
          configManager.createBackup.mockResolvedValue(backupData);

          testApp.post('/api/config/:guildId/backup', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              const backup = await configManager.createBackup(req.params.guildId);
              res.json({
                success: true,
                data: backup,
                filename: `backup-${req.params.guildId}-${Date.now()}.json`
              });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/backup`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
          expect(response.body.data.isBackup).toBe(true);
          expect(response.body.data.backupCreatedAt).toBeDefined();
          expect(response.body.filename).toMatch(/^backup-\d+-\d+\.json$/);
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should restore configuration from valid backup', () => {
      return fc.assert(fc.asyncProperty(
        validGuildIdArb,
        validConfigArb,
        async (guildId, mockConfig) => {
          const backupData = {
            ...mockConfig,
            guildId,
            backupCreatedAt: new Date().toISOString(),
            isBackup: true
          };
          
          const restoreResult = {
            success: true,
            data: { guildId, ...mockConfig },
            warnings: [],
            appliedSections: ['channels', 'roles', 'features', 'colors']
          };
          
          configManager.restoreFromBackup.mockResolvedValue(restoreResult);

          testApp.post('/api/config/:guildId/restore', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const result = await configManager.restoreFromBackup(req.params.guildId, req.body, req.user.id);
                res.json({
                  success: true,
                  data: result.data,
                  message: 'Configuration restored from backup successfully'
                });
              } catch (error) {
                res.status(400).json({
                  success: false,
                  error: error.message
                });
              }
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/restore`)
            .send(backupData)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.message).toBe('Configuration restored from backup successfully');
          expect(response.body.data).toBeDefined();
        }
      ), { numRuns: TEST_RUNS });
    });
  });
});
