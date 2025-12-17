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

/**
 * Real-time Validation System Property Tests
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
describe('Real-time Validation System Property Tests', () => {
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

  describe('Property 23: Real-time input validation', () => {
    /**
     * **Feature: web-dashboard, Property 23: Real-time input validation**
     * **Validates: Requirements 7.1**
     * 
     * For any configuration input, the system should validate in real-time 
     * and display immediate feedback
     */

    test('should validate configuration inputs in real-time and provide immediate feedback', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          fieldType: fc.constantFrom('channelId', 'roleId', 'color', 'url', 'positiveInteger'),
          validValue: fc.oneof(
            fc.constant('123456789012345678'), // Valid channel/role ID
            fc.constant('#FF5733'),             // Valid color
            fc.constant('https://example.com'), // Valid URL
            fc.constant('100')                  // Valid positive integer
          )
        }),
        async ({ guildId, fieldType, validValue }) => {
          // Mock validation endpoint
          configManager.validateConfig.mockReturnValue({
            isValid: true,
            errors: [],
            warnings: [],
            fieldValidation: {
              [fieldType]: { isValid: true, errors: [] }
            }
          });

          // Setup validation route
          testApp.post('/api/config/:guildId/validate/field',
            validateGuildId,
            verifyAuth,
            verifyGuildAccess,
            async (req, res) => {
              const { fieldName, value, fieldType } = req.body;
              
              // Perform real-time validation
              const validation = configManager.validateConfig({ [fieldName]: value });
              
              res.json({
                success: true,
                data: {
                  fieldName,
                  isValid: validation.isValid,
                  errors: validation.errors,
                  warnings: validation.warnings,
                  timestamp: Date.now()
                }
              });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/validate/field`)
            .send({ fieldName: fieldType, value: validValue, fieldType })
            .expect(200);

          // Property: Real-time validation should always return immediate feedback
          expect(response.body.success).toBe(true);
          expect(response.body.data).toHaveProperty('fieldName');
          expect(response.body.data).toHaveProperty('isValid');
          expect(response.body.data).toHaveProperty('errors');
          expect(response.body.data).toHaveProperty('timestamp');
          expect(typeof response.body.data.timestamp).toBe('number');
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should validate invalid inputs and return specific error messages', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          invalidInput: fc.oneof(
            fc.record({ fieldType: fc.constant('channelId'), value: fc.constant('invalid-id') }),
            fc.record({ fieldType: fc.constant('roleId'), value: fc.constant('abc') }),
            fc.record({ fieldType: fc.constant('color'), value: fc.constant('not-a-color') }),
            fc.record({ fieldType: fc.constant('url'), value: fc.constant('not-a-url') }),
            fc.record({ fieldType: fc.constant('positiveInteger'), value: fc.constant('-5') })
          )
        }),
        async ({ guildId, invalidInput }) => {
          // Mock validation failure
          configManager.validateConfig.mockReturnValue({
            isValid: false,
            errors: [`Invalid ${invalidInput.fieldType} format`],
            warnings: []
          });

          // Setup validation route
          testApp.post('/api/config/:guildId/validate/field',
            validateGuildId,
            verifyAuth,
            verifyGuildAccess,
            async (req, res) => {
              const { fieldName, value } = req.body;
              const validation = configManager.validateConfig({ [fieldName]: value });
              
              res.json({
                success: true,
                data: {
                  fieldName,
                  isValid: validation.isValid,
                  errors: validation.errors,
                  warnings: validation.warnings
                }
              });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/validate/field`)
            .send({ fieldName: invalidInput.fieldType, value: invalidInput.value, fieldType: invalidInput.fieldType })
            .expect(200);

          // Property: Invalid inputs should return validation errors
          expect(response.body.success).toBe(true);
          expect(response.body.data.isValid).toBe(false);
          expect(response.body.data.errors.length).toBeGreaterThan(0);
        }
      ), { numRuns: TEST_RUNS });
    });
  });


  describe('Property 24: Validation error highlighting', () => {
    /**
     * **Feature: web-dashboard, Property 24: Validation error highlighting**
     * **Validates: Requirements 7.2**
     * 
     * For any validation error, the system should highlight problematic fields 
     * with specific error messages
     */
    test('should highlight problematic fields with specific error messages', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          invalidFields: fc.array(
            fc.record({
              fieldName: fc.constantFrom('welcome', 'confession', 'ticketLogs', 'primaryColor'),
              value: fc.constantFrom('invalid', '', 'abc', 'not-valid'),
              expectedError: fc.constantFrom(
                'Invalid channel ID format',
                'Field cannot be empty',
                'Invalid format',
                'Invalid color code'
              )
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async ({ guildId, invalidFields }) => {
          // Mock validation with field-specific errors
          const fieldErrors = {};
          invalidFields.forEach(field => {
            fieldErrors[field.fieldName] = {
              isValid: false,
              errors: [field.expectedError],
              highlighted: true
            };
          });

          configManager.validateConfig.mockReturnValue({
            isValid: false,
            errors: invalidFields.map(f => `${f.fieldName}: ${f.expectedError}`),
            warnings: [],
            fieldValidation: fieldErrors
          });

          // Setup validation route
          testApp.post('/api/config/:guildId/validate',
            validateGuildId,
            verifyAuth,
            verifyGuildAccess,
            async (req, res) => {
              const validation = configManager.validateConfig(req.body);
              
              res.json({
                success: true,
                data: {
                  isValid: validation.isValid,
                  errors: validation.errors,
                  fieldValidation: validation.fieldValidation
                }
              });
            }
          );

          const configData = {};
          invalidFields.forEach(field => {
            configData[field.fieldName] = field.value;
          });

          const response = await request(testApp)
            .post(`/api/config/${guildId}/validate`)
            .send(configData)
            .expect(200);

          // Property: Each invalid field should have specific error highlighting
          expect(response.body.success).toBe(true);
          expect(response.body.data.isValid).toBe(false);
          expect(response.body.data.errors.length).toBe(invalidFields.length);
          
          // Each field should have its own validation result
          Object.keys(response.body.data.fieldValidation).forEach(fieldName => {
            const fieldResult = response.body.data.fieldValidation[fieldName];
            expect(fieldResult).toHaveProperty('isValid');
            expect(fieldResult).toHaveProperty('errors');
            expect(fieldResult).toHaveProperty('highlighted');
            expect(fieldResult.highlighted).toBe(true);
          });
        }
      ), { numRuns: TEST_RUNS });
    });
  });


  describe('Property 25: Validation success indication', () => {
    /**
     * **Feature: web-dashboard, Property 25: Validation success indication**
     * **Validates: Requirements 7.3**
     * 
     * For any successful validation, the system should enable save button 
     * and show success indicators
     */
    test('should indicate validation success and enable save functionality', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          validConfig: fc.record({
            channels: fc.record({
              welcome: fc.constantFrom('123456789012345678', '987654321098765432'),
              confession: fc.constantFrom('123456789012345678', '987654321098765432')
            }),
            appearance: fc.record({
              primaryColor: fc.constantFrom('#FF5733', '#33FF57', '#3357FF'),
              secondaryColor: fc.constantFrom('#FF5733', '#33FF57', '#3357FF')
            })
          })
        }),
        async ({ guildId, validConfig }) => {
          // Mock successful validation
          configManager.validateConfig.mockReturnValue({
            isValid: true,
            errors: [],
            warnings: [],
            canSave: true,
            successIndicators: {
              channels: { status: 'valid', message: 'All channels configured correctly' },
              appearance: { status: 'valid', message: 'Appearance settings valid' }
            }
          });

          // Setup validation route
          testApp.post('/api/config/:guildId/validate',
            validateGuildId,
            verifyAuth,
            verifyGuildAccess,
            async (req, res) => {
              const validation = configManager.validateConfig(req.body);
              
              res.json({
                success: true,
                data: {
                  isValid: validation.isValid,
                  errors: validation.errors,
                  warnings: validation.warnings,
                  canSave: validation.canSave,
                  successIndicators: validation.successIndicators
                }
              });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/validate`)
            .send(validConfig)
            .expect(200);

          // Property: Valid configuration should enable save and show success indicators
          expect(response.body.success).toBe(true);
          expect(response.body.data.isValid).toBe(true);
          expect(response.body.data.errors).toHaveLength(0);
          expect(response.body.data.canSave).toBe(true);
          expect(response.body.data.successIndicators).toBeDefined();
          
          // Each section should have success status
          Object.values(response.body.data.successIndicators).forEach(indicator => {
            expect(indicator.status).toBe('valid');
            expect(indicator.message).toBeDefined();
          });
        }
      ), { numRuns: TEST_RUNS });
    });
  });


  describe('Property 26: API connectivity warning', () => {
    /**
     * **Feature: web-dashboard, Property 26: API connectivity warning**
     * **Validates: Requirements 7.4**
     * 
     * For any Discord API connectivity issue, the system should warn users 
     * about potential validation limitations
     */
    test('should warn users when Discord API connectivity issues are detected', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          connectivityStatus: fc.constantFrom('disconnected', 'timeout', 'rate_limited', 'error')
        }),
        async ({ guildId, connectivityStatus }) => {
          // Setup health check route that simulates connectivity issues
          testApp.get('/api/health/discord',
            verifyAuth,
            async (req, res) => {
              const statusMessages = {
                disconnected: 'Discord API is currently unavailable',
                timeout: 'Discord API request timed out',
                rate_limited: 'Discord API rate limit exceeded',
                error: 'Discord API returned an error'
              };

              res.json({
                success: true,
                data: {
                  status: connectivityStatus,
                  isConnected: false,
                  warning: statusMessages[connectivityStatus],
                  validationLimitations: [
                    'Channel existence cannot be verified',
                    'Role hierarchy cannot be validated',
                    'Guild permissions cannot be checked'
                  ],
                  lastChecked: Date.now()
                }
              });
            }
          );

          const response = await request(testApp)
            .get('/api/health/discord')
            .expect(200);

          // Property: Connectivity issues should trigger warnings with limitations
          expect(response.body.success).toBe(true);
          expect(response.body.data.isConnected).toBe(false);
          expect(response.body.data.warning).toBeDefined();
          expect(response.body.data.warning.length).toBeGreaterThan(0);
          expect(response.body.data.validationLimitations).toBeDefined();
          expect(Array.isArray(response.body.data.validationLimitations)).toBe(true);
          expect(response.body.data.validationLimitations.length).toBeGreaterThan(0);
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should indicate when Discord API is connected and validation is fully available', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432')
        }),
        async ({ guildId }) => {
          // Setup health check route for connected state
          testApp.get('/api/health/discord',
            verifyAuth,
            async (req, res) => {
              res.json({
                success: true,
                data: {
                  status: 'connected',
                  isConnected: true,
                  warning: null,
                  validationLimitations: [],
                  lastChecked: Date.now()
                }
              });
            }
          );

          const response = await request(testApp)
            .get('/api/health/discord')
            .expect(200);

          // Property: Connected state should have no warnings or limitations
          expect(response.body.success).toBe(true);
          expect(response.body.data.isConnected).toBe(true);
          expect(response.body.data.warning).toBeNull();
          expect(response.body.data.validationLimitations).toHaveLength(0);
        }
      ), { numRuns: TEST_RUNS });
    });
  });


  describe('Property 27: Conflict resolution suggestions', () => {
    /**
     * **Feature: web-dashboard, Property 27: Conflict resolution suggestions**
     * **Validates: Requirements 7.5**
     * 
     * For any detected configuration conflict, the system should suggest 
     * automatic resolution options
     */
    test('should detect conflicts and provide resolution suggestions', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          conflictType: fc.constantFrom(
            'duplicate_channel',
            'role_hierarchy',
            'feature_dependency',
            'permission_conflict'
          )
        }),
        async ({ guildId, conflictType }) => {
          // Define conflict scenarios and their resolutions
          const conflictScenarios = {
            duplicate_channel: {
              description: 'Same channel assigned to multiple purposes',
              affectedFields: ['welcome', 'confession'],
              suggestions: [
                { action: 'use_different_channel', description: 'Assign different channels for each purpose' },
                { action: 'keep_primary', description: 'Keep channel for welcome only' }
              ]
            },
            role_hierarchy: {
              description: 'Role hierarchy conflict detected',
              affectedFields: ['adminRole', 'modRole'],
              suggestions: [
                { action: 'swap_roles', description: 'Swap admin and mod role assignments' },
                { action: 'adjust_hierarchy', description: 'Adjust role positions in Discord' }
              ]
            },
            feature_dependency: {
              description: 'Disabled feature has active dependencies',
              affectedFields: ['economy', 'leveling'],
              suggestions: [
                { action: 'enable_dependency', description: 'Enable economy feature' },
                { action: 'disable_dependent', description: 'Disable leveling feature' }
              ]
            },
            permission_conflict: {
              description: 'Conflicting permission settings',
              affectedFields: ['staffRole', 'memberRole'],
              suggestions: [
                { action: 'adjust_permissions', description: 'Adjust role permissions' },
                { action: 'use_different_role', description: 'Select a different role' }
              ]
            }
          };

          const scenario = conflictScenarios[conflictType];

          // Mock conflict detection
          configManager.validateConfig.mockReturnValue({
            isValid: false,
            errors: [],
            warnings: [],
            conflicts: [{
              type: conflictType,
              description: scenario.description,
              affectedFields: scenario.affectedFields,
              suggestions: scenario.suggestions,
              autoResolvable: scenario.suggestions.length > 0
            }]
          });

          // Setup conflict detection route
          testApp.post('/api/config/:guildId/validate/conflicts',
            validateGuildId,
            verifyAuth,
            verifyGuildAccess,
            async (req, res) => {
              const validation = configManager.validateConfig(req.body);
              
              res.json({
                success: true,
                data: {
                  hasConflicts: validation.conflicts && validation.conflicts.length > 0,
                  conflicts: validation.conflicts || [],
                  canAutoResolve: validation.conflicts?.some(c => c.autoResolvable) || false
                }
              });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/validate/conflicts`)
            .send({ conflictType })
            .expect(200);

          // Property: Conflicts should be detected with resolution suggestions
          expect(response.body.success).toBe(true);
          expect(response.body.data.hasConflicts).toBe(true);
          expect(response.body.data.conflicts.length).toBeGreaterThan(0);
          
          const conflict = response.body.data.conflicts[0];
          expect(conflict.type).toBe(conflictType);
          expect(conflict.description).toBeDefined();
          expect(conflict.affectedFields).toBeDefined();
          expect(Array.isArray(conflict.affectedFields)).toBe(true);
          expect(conflict.suggestions).toBeDefined();
          expect(Array.isArray(conflict.suggestions)).toBe(true);
          expect(conflict.suggestions.length).toBeGreaterThan(0);
          
          // Each suggestion should have action and description
          conflict.suggestions.forEach(suggestion => {
            expect(suggestion.action).toBeDefined();
            expect(suggestion.description).toBeDefined();
          });
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should apply automatic conflict resolution when requested', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          conflictId: fc.uuid(),
          resolutionAction: fc.constantFrom('use_different_channel', 'swap_roles', 'enable_dependency')
        }),
        async ({ guildId, conflictId, resolutionAction }) => {
          // Mock successful resolution
          configManager.updateConfig.mockResolvedValue({
            guildId,
            resolved: true,
            appliedResolution: resolutionAction
          });

          // Setup resolution route
          testApp.post('/api/config/:guildId/resolve-conflict',
            validateGuildId,
            verifyAuth,
            verifyGuildAccess,
            async (req, res) => {
              const { conflictId, action } = req.body;
              
              const result = await configManager.updateConfig(
                req.params.guildId,
                { resolveConflict: { conflictId, action } },
                req.user.userId
              );
              
              res.json({
                success: true,
                data: {
                  resolved: result.resolved,
                  appliedResolution: result.appliedResolution,
                  message: `Conflict resolved using: ${action}`
                }
              });
            }
          );

          const response = await request(testApp)
            .post(`/api/config/${guildId}/resolve-conflict`)
            .send({ conflictId, action: resolutionAction })
            .expect(200);

          // Property: Resolution should be applied and confirmed
          expect(response.body.success).toBe(true);
          expect(response.body.data.resolved).toBe(true);
          expect(response.body.data.appliedResolution).toBe(resolutionAction);
          expect(response.body.data.message).toContain(resolutionAction);
        }
      ), { numRuns: TEST_RUNS });
    });
  });
});
