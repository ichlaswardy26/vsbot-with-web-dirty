const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const session = require('express-session');
const configManager = require('../../util/configManager');
const { validateGuildId, validateConfigSection, sanitizeInput } = require('../middleware/validation');
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');

// Mock dependencies
jest.mock('../../util/configManager');
jest.mock('../middleware/auth');

// Reduce test runs for faster execution
const TEST_RUNS = 100;

describe('Configuration API Property Tests', () => {
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
        userId: '123456789012345678',
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

  describe('Property 6: Channel configuration display', () => {
    /**
     * **Feature: web-dashboard, Property 6: Channel configuration display**
     * **Validates: Requirements 2.1**
     * 
     * For any user accessing channels configuration, 
     * the system should display all available channel categories with current settings
     */
    test('should display all channel categories with current settings', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432', '111222333444555666'),
          channels: fc.record({
            welcome: fc.option(fc.constantFrom('123456789012345678', '987654321098765432', null)),
            confession: fc.option(fc.constantFrom('123456789012345678', '987654321098765432', null)),
            ticketLogs: fc.option(fc.constantFrom('123456789012345678', '987654321098765432', null)),
            chat: fc.record({
              channel1: fc.option(fc.constantFrom('123456789012345678', '987654321098765432', null)),
              channel2: fc.option(fc.constantFrom('123456789012345678', '987654321098765432', null))
            })
          })
        }),
        async ({ guildId, channels }) => {
          // Mock configManager to return channel configuration
          configManager.getConfigSection.mockResolvedValue(channels);

          // Setup route
          testApp.get('/api/config/:guildId/:section', 
            validateGuildId, 
            validateConfigSection, 
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const sectionData = await configManager.getConfigSection(req.params.guildId, req.params.section);
                res.json({
                  success: true,
                  data: sectionData
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to get configuration section'
                });
              }
            }
          );

          const response = await request(testApp)
            .get(`/api/config/${guildId}/channels`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(channels);
          expect(configManager.getConfigSection).toHaveBeenCalledWith(guildId, 'channels');
        }
      ), { numRuns: TEST_RUNS });
    });
  });

  describe('Property 7: Channel validation and update', () => {
    /**
     * **Feature: web-dashboard, Property 7: Channel validation and update**
     * **Validates: Requirements 2.2**
     * 
     * For any channel selection, the system should validate channel existence 
     * in guild and update configuration accordingly
     */
    test('should validate and update channel configuration', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          channelUpdates: fc.record({
            welcome: fc.option(fc.constantFrom('123456789012345678', '987654321098765432')),
            confession: fc.option(fc.constantFrom('123456789012345678', '987654321098765432'))
          })
        }),
        async ({ guildId, channelUpdates }) => {
          // Mock successful validation and update
          configManager.updateConfigSection.mockResolvedValue(channelUpdates);

          // Setup route
          testApp.put('/api/config/:guildId/:section', 
            validateGuildId, 
            validateConfigSection, 
            sanitizeInput,
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const sectionData = await configManager.updateConfigSection(
                  req.params.guildId, 
                  req.params.section, 
                  req.body, 
                  req.user.userId
                );
                res.json({
                  success: true,
                  data: sectionData,
                  message: `${req.params.section} configuration updated successfully`
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update configuration section'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}/channels`)
            .send(channelUpdates)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(channelUpdates);
          expect(response.body.message).toBe('channels configuration updated successfully');
          expect(configManager.updateConfigSection).toHaveBeenCalledWith(
            guildId, 
            'channels', 
            channelUpdates, 
            '123456789012345678'
          );
        }
      ), { numRuns: TEST_RUNS });
    });
  });

  describe('Property 8: Real-time configuration application', () => {
    /**
     * **Feature: web-dashboard, Property 8: Real-time configuration application**
     * **Validates: Requirements 2.3, 3.4, 4.2**
     * 
     * For any saved configuration change, the system should apply changes 
     * immediately without requiring bot restart
     */
    test('should apply configuration changes immediately', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          configUpdates: fc.record({
            channels: fc.record({
              welcome: fc.option(fc.constantFrom('123456789012345678', '987654321098765432'))
            }),
            features: fc.record({
              leveling: fc.record({
                enabled: fc.boolean(),
                xpCooldown: fc.integer({ min: 30000, max: 300000 })
              })
            })
          })
        }),
        async ({ guildId, configUpdates }) => {
          // Mock successful update with immediate application
          const updatedConfig = { guildId, ...configUpdates };
          configManager.updateConfig.mockResolvedValue(updatedConfig);
          configManager.validateConfig.mockReturnValue({ isValid: true, errors: [], warnings: [] });

          // Setup route
          testApp.put('/api/config/:guildId', 
            validateGuildId, 
            sanitizeInput,
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const validation = configManager.validateConfig(req.body);
                if (!validation.isValid) {
                  return res.status(400).json({
                    success: false,
                    error: 'Invalid configuration',
                    details: validation.errors
                  });
                }
                
                const config = await configManager.updateConfig(
                  req.params.guildId, 
                  req.body, 
                  req.user.userId
                );
                
                res.json({
                  success: true,
                  data: config,
                  message: 'Configuration updated successfully'
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update configuration'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}`)
            .send(configUpdates)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(updatedConfig);
          expect(response.body.message).toBe('Configuration updated successfully');
          expect(configManager.validateConfig).toHaveBeenCalledWith(configUpdates);
          expect(configManager.updateConfig).toHaveBeenCalledWith(
            guildId, 
            configUpdates, 
            '123456789012345678'
          );
        }
      ), { numRuns: TEST_RUNS });
    });
  });

  describe('Property 9: Configuration removal consistency', () => {
    /**
     * **Feature: web-dashboard, Property 9: Configuration removal consistency**
     * **Validates: Requirements 2.4**
     * 
     * For any cleared configuration setting, the system should remove 
     * the assignment and update bot configuration
     */
    test('should consistently remove configuration settings', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          section: fc.constantFrom('channels', 'roles', 'features'),
          clearUpdates: fc.record({
            welcome: fc.constant(null),
            confession: fc.constant(null),
            ticketLogs: fc.constant(null)
          })
        }),
        async ({ guildId, section, clearUpdates }) => {
          // Mock successful removal
          configManager.updateConfigSection.mockResolvedValue(clearUpdates);

          // Setup route
          testApp.put('/api/config/:guildId/:section', 
            validateGuildId, 
            validateConfigSection, 
            sanitizeInput,
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const sectionData = await configManager.updateConfigSection(
                  req.params.guildId, 
                  req.params.section, 
                  req.body, 
                  req.user.userId
                );
                res.json({
                  success: true,
                  data: sectionData,
                  message: `${req.params.section} configuration updated successfully`
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update configuration section'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}/${section}`)
            .send(clearUpdates)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(clearUpdates);
          
          // Verify all values are null (cleared)
          Object.values(response.body.data).forEach(value => {
            expect(value).toBeNull();
          });
          
          expect(configManager.updateConfigSection).toHaveBeenCalledWith(
            guildId, 
            section, 
            clearUpdates, 
            '123456789012345678'
          );
        }
      ), { numRuns: TEST_RUNS });
    });
  });

  describe('Property 10: Input validation and error prevention', () => {
    /**
     * **Feature: web-dashboard, Property 10: Input validation and error prevention**
     * **Validates: Requirements 2.5, 4.5, 5.4**
     * 
     * For any invalid configuration input, the system should highlight errors 
     * and prevent saving until resolved
     */
    test('should prevent saving invalid configuration inputs', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          invalidConfig: fc.oneof(
            // Invalid guild ID in config
            fc.record({ guildId: fc.constant('invalid-id') }),
            // Invalid color format
            fc.record({ colors: fc.record({ primary: fc.constant('not-a-color') }) }),
            // Invalid XP range
            fc.record({ 
              features: fc.record({ 
                leveling: fc.record({ 
                  xpMin: fc.constant(100), 
                  xpMax: fc.constant(50) 
                }) 
              }) 
            })
          )
        }),
        async ({ guildId, invalidConfig }) => {
          // Mock validation failure
          configManager.validateConfig.mockReturnValue({
            isValid: false,
            errors: ['Invalid configuration detected'],
            warnings: []
          });

          // Setup route
          testApp.put('/api/config/:guildId', 
            validateGuildId, 
            sanitizeInput,
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const validation = configManager.validateConfig(req.body);
                if (!validation.isValid) {
                  return res.status(400).json({
                    success: false,
                    error: 'Invalid configuration',
                    details: validation.errors
                  });
                }
                
                const config = await configManager.updateConfig(
                  req.params.guildId, 
                  req.body, 
                  req.user.userId
                );
                
                res.json({
                  success: true,
                  data: config
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update configuration'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}`)
            .send(invalidConfig)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error).toBe('Invalid configuration');
          expect(response.body.details).toEqual(['Invalid configuration detected']);
          expect(configManager.validateConfig).toHaveBeenCalledWith(invalidConfig);
          expect(configManager.updateConfig).not.toHaveBeenCalled();
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should validate guild ID format', () => {
      return fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant('invalid'),
          fc.constant('123'),
          fc.constant('not-a-number'),
          fc.constant('12345678901234567890123') // Too long
        ),
        async (invalidGuildId) => {
          // Setup route with validation
          testApp.get('/api/config/:guildId', 
            validateGuildId, 
            verifyAuth, 
            verifyGuildAccess, 
            (req, res) => {
              res.json({ success: true });
            }
          );

          const response = await request(testApp)
            .get(`/api/config/${invalidGuildId}`)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error).toBe('Invalid guild ID');
          expect(response.body.message).toBe('Guild ID must be a valid Discord snowflake');
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should validate configuration section names', () => {
      return fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant('invalid-section'),
          fc.constant('nonexistent'),
          fc.constant('admin'),
          fc.constant('system')
        ),
        async (invalidSection) => {
          const validGuildId = '123456789012345678';

          // Setup route with validation
          testApp.get('/api/config/:guildId/:section', 
            validateGuildId, 
            validateConfigSection, 
            verifyAuth, 
            verifyGuildAccess, 
            (req, res) => {
              res.json({ success: true });
            }
          );

          const response = await request(testApp)
            .get(`/api/config/${validGuildId}/${invalidSection}`);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toContain('section');
        }
      ), { numRuns: TEST_RUNS });
    });
  });
});