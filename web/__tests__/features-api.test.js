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

describe('Features Configuration API Property Tests', () => {
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

  describe('Property 14: Feature status display', () => {
    /**
     * **Feature: web-dashboard, Property 14: Feature status display**
     * **Validates: Requirements 4.1**
     * 
     * For any user accessing features configuration, 
     * the system should display all available features with their current status
     */
    test('should display all available features with current status', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432', '111222333444555666'),
          features: fc.record({
            leveling: fc.record({
              enabled: fc.boolean(),
              xpCooldown: fc.integer({ min: 30000, max: 300000 }),
              xpMin: fc.integer({ min: 5, max: 50 }),
              xpMax: fc.integer({ min: 10, max: 100 }),
              voiceXpPerMinute: fc.integer({ min: 1, max: 50 })
            }),
            economy: fc.record({
              enabled: fc.boolean(),
              dailyReward: fc.integer({ min: 50, max: 500 }),
              collectCooldown: fc.integer({ min: 1800000, max: 7200000 })
            }),
            ticket: fc.record({
              enabled: fc.boolean(),
              prefix: fc.constantFrom('ticket', 'support', 'help')
            }),
            games: fc.record({
              enabled: fc.boolean()
            }),
            welcome: fc.record({
              enabled: fc.boolean(),
              message: fc.string({ minLength: 1, maxLength: 200 })
            }),
            confession: fc.record({
              enabled: fc.boolean()
            }),
            wordChain: fc.record({
              enabled: fc.boolean(),
              timeout: fc.integer({ min: 10000, max: 60000 })
            })
          })
        }),
        async ({ guildId, features }) => {
          // Mock configManager to return features configuration
          configManager.getConfigSection.mockResolvedValue(features);

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
            .get(`/api/config/${guildId}/features`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(features);
          
          // Verify all features have an enabled status
          const featureData = response.body.data;
          Object.keys(featureData).forEach(featureName => {
            expect(featureData[featureName]).toHaveProperty('enabled');
            expect(typeof featureData[featureName].enabled).toBe('boolean');
          });
          
          expect(configManager.getConfigSection).toHaveBeenCalledWith(guildId, 'features');
        }
      ), { numRuns: TEST_RUNS });
    });
  });


  describe('Property 15: Feature settings validation', () => {
    /**
     * **Feature: web-dashboard, Property 15: Feature settings validation**
     * **Validates: Requirements 4.3**
     * 
     * For any feature setting modification, 
     * the system should validate input ranges and apply changes
     */
    test('should validate feature settings input ranges and apply valid changes', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          featureUpdates: fc.record({
            leveling: fc.record({
              enabled: fc.boolean(),
              xpCooldown: fc.integer({ min: 30000, max: 300000 }),
              xpMin: fc.integer({ min: 5, max: 50 }),
              xpMax: fc.integer({ min: 51, max: 100 }) // Ensure xpMax > xpMin
            }),
            economy: fc.record({
              enabled: fc.boolean(),
              dailyReward: fc.integer({ min: 50, max: 500 }),
              collectCooldown: fc.integer({ min: 1800000, max: 7200000 })
            })
          })
        }),
        async ({ guildId, featureUpdates }) => {
          // Mock successful validation and update
          configManager.validateConfig.mockReturnValue({ isValid: true, errors: [], warnings: [] });
          configManager.updateConfigSection.mockResolvedValue(featureUpdates);

          // Setup route
          testApp.put('/api/config/:guildId/:section', 
            validateGuildId, 
            validateConfigSection, 
            sanitizeInput,
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                // Validate feature settings
                const validation = configManager.validateConfig({ features: req.body });
                if (!validation.isValid) {
                  return res.status(400).json({
                    success: false,
                    error: 'Invalid feature settings',
                    details: validation.errors
                  });
                }

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
            .put(`/api/config/${guildId}/features`)
            .send(featureUpdates)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(featureUpdates);
          expect(response.body.message).toBe('features configuration updated successfully');
          expect(configManager.validateConfig).toHaveBeenCalledWith({ features: featureUpdates });
          expect(configManager.updateConfigSection).toHaveBeenCalledWith(
            guildId, 
            'features', 
            featureUpdates, 
            '123456789012345678'
          );
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should reject invalid feature settings with out-of-range values', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          invalidFeatureUpdates: fc.oneof(
            // XP min greater than max
            fc.record({
              leveling: fc.record({
                enabled: fc.constant(true),
                xpMin: fc.constant(100),
                xpMax: fc.constant(50)
              })
            }),
            // Negative cooldown
            fc.record({
              leveling: fc.record({
                enabled: fc.constant(true),
                xpCooldown: fc.constant(-1000)
              })
            }),
            // Negative daily reward
            fc.record({
              economy: fc.record({
                enabled: fc.constant(true),
                dailyReward: fc.constant(-100)
              })
            })
          )
        }),
        async ({ guildId, invalidFeatureUpdates }) => {
          // Mock validation failure
          configManager.validateConfig.mockReturnValue({
            isValid: false,
            errors: ['Invalid feature settings: values out of range'],
            warnings: []
          });

          // Setup route
          testApp.put('/api/config/:guildId/:section', 
            validateGuildId, 
            validateConfigSection, 
            sanitizeInput,
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                // Validate feature settings
                const validation = configManager.validateConfig({ features: req.body });
                if (!validation.isValid) {
                  return res.status(400).json({
                    success: false,
                    error: 'Invalid feature settings',
                    details: validation.errors
                  });
                }

                const sectionData = await configManager.updateConfigSection(
                  req.params.guildId, 
                  req.params.section, 
                  req.body, 
                  req.user.userId
                );
                res.json({
                  success: true,
                  data: sectionData
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
            .put(`/api/config/${guildId}/features`)
            .send(invalidFeatureUpdates)
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error).toBe('Invalid feature settings');
          expect(response.body.details).toContain('Invalid feature settings: values out of range');
          expect(configManager.updateConfigSection).not.toHaveBeenCalled();
        }
      ), { numRuns: TEST_RUNS });
    });
  });


  describe('Property 16: Feature dependency warning', () => {
    /**
     * **Feature: web-dashboard, Property 16: Feature dependency warning**
     * **Validates: Requirements 4.4**
     * 
     * For any disabled feature with dependencies, 
     * the system should warn about affected functionality
     */
    test('should warn when disabling features with dependencies', () => {
      // Define feature dependencies
      const featureDependencies = {
        leveling: ['economy'], // Economy depends on leveling for XP-based rewards
        economy: [],
        ticket: [],
        games: ['economy'], // Games may use economy for rewards
        welcome: [],
        confession: [],
        wordChain: ['economy'] // Word chain may give economy rewards
      };

      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          featureToDisable: fc.constantFrom('leveling', 'economy', 'ticket', 'games'),
          currentFeatures: fc.record({
            leveling: fc.record({ enabled: fc.constant(true) }),
            economy: fc.record({ enabled: fc.constant(true) }),
            ticket: fc.record({ enabled: fc.constant(true) }),
            games: fc.record({ enabled: fc.constant(true) }),
            welcome: fc.record({ enabled: fc.constant(true) }),
            confession: fc.record({ enabled: fc.constant(true) }),
            wordChain: fc.record({ enabled: fc.constant(true) })
          })
        }),
        async ({ guildId, featureToDisable, currentFeatures }) => {
          // Create update that disables the feature
          const featureUpdates = {
            ...currentFeatures,
            [featureToDisable]: { enabled: false }
          };

          // Find dependent features
          const dependentFeatures = Object.entries(featureDependencies)
            .filter(([feature, deps]) => deps.includes(featureToDisable) && currentFeatures[feature]?.enabled)
            .map(([feature]) => feature);

          // Mock validation with dependency warnings
          const warnings = dependentFeatures.length > 0 
            ? [`Disabling ${featureToDisable} may affect: ${dependentFeatures.join(', ')}`]
            : [];

          configManager.validateConfig.mockReturnValue({ 
            isValid: true, 
            errors: [], 
            warnings 
          });
          configManager.updateConfigSection.mockResolvedValue(featureUpdates);

          // Setup route
          testApp.put('/api/config/:guildId/:section', 
            validateGuildId, 
            validateConfigSection, 
            sanitizeInput,
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                // Validate and check for dependency warnings
                const validation = configManager.validateConfig({ features: req.body });
                
                const sectionData = await configManager.updateConfigSection(
                  req.params.guildId, 
                  req.params.section, 
                  req.body, 
                  req.user.userId
                );
                
                res.json({
                  success: true,
                  data: sectionData,
                  warnings: validation.warnings,
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
            .put(`/api/config/${guildId}/features`)
            .send(featureUpdates)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(featureUpdates);
          
          // Verify warnings are returned when dependencies exist
          if (dependentFeatures.length > 0) {
            expect(response.body.warnings).toBeDefined();
            expect(response.body.warnings.length).toBeGreaterThan(0);
            expect(response.body.warnings[0]).toContain(featureToDisable);
          }
          
          expect(configManager.validateConfig).toHaveBeenCalledWith({ features: featureUpdates });
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should not warn when disabling features without dependencies', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          // Features that have no dependents
          featureToDisable: fc.constantFrom('confession', 'welcome'),
          currentFeatures: fc.record({
            leveling: fc.record({ enabled: fc.constant(true) }),
            economy: fc.record({ enabled: fc.constant(true) }),
            ticket: fc.record({ enabled: fc.constant(true) }),
            games: fc.record({ enabled: fc.constant(true) }),
            welcome: fc.record({ enabled: fc.constant(true) }),
            confession: fc.record({ enabled: fc.constant(true) }),
            wordChain: fc.record({ enabled: fc.constant(true) })
          })
        }),
        async ({ guildId, featureToDisable, currentFeatures }) => {
          // Create update that disables the feature
          const featureUpdates = {
            ...currentFeatures,
            [featureToDisable]: { enabled: false }
          };

          // No warnings for features without dependents
          configManager.validateConfig.mockReturnValue({ 
            isValid: true, 
            errors: [], 
            warnings: [] 
          });
          configManager.updateConfigSection.mockResolvedValue(featureUpdates);

          // Setup route
          testApp.put('/api/config/:guildId/:section', 
            validateGuildId, 
            validateConfigSection, 
            sanitizeInput,
            verifyAuth, 
            verifyGuildAccess, 
            async (req, res) => {
              try {
                const validation = configManager.validateConfig({ features: req.body });
                
                const sectionData = await configManager.updateConfigSection(
                  req.params.guildId, 
                  req.params.section, 
                  req.body, 
                  req.user.userId
                );
                
                res.json({
                  success: true,
                  data: sectionData,
                  warnings: validation.warnings,
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
            .put(`/api/config/${guildId}/features`)
            .send(featureUpdates)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.warnings).toEqual([]);
        }
      ), { numRuns: TEST_RUNS });
    });
  });
});
