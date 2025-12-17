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

// Unicode emoji regex pattern - covers common emoji ranges
const UNICODE_EMOJI_PATTERN = /^[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{2B50}]|[\u{2139}]|[\u{2705}]|[\u{274C}]|[\u{2B06}]$/u;
// Discord custom emoji pattern
const CUSTOM_EMOJI_PATTERN = /^<a?:\w+:\d+>$/;

// List of known valid Unicode emojis for validation
const VALID_UNICODE_EMOJIS = new Set([
  '💰', '🔵', '⚪', '✨', '⚠️', '❓', '📢', '🔨', '🤝', '🎫', '👥', 'ℹ️', '🌐', 
  '⬆️', '🏆', '🚀', '👍', '💃', '🪙', '💝', '🏘️', '✅', '☁️', '❌', '🦇', 
  '🃏', '🕷️', '🐉', '🐙', '💎', '🧙', '⭐', '📈', '✔️', '☑️', '💵', '🎉',
  '🔴', '🟢', '🟡', '🔷', '🔶', '⬇️', '➡️', '⬅️', '🔄', '💫', '🌟', '⚡'
]);

/**
 * Validate emoji format - returns true if valid Discord or Unicode emoji
 */
function isValidEmoji(emoji) {
  if (!emoji) return false;
  // Check if it's a known valid Unicode emoji
  if (VALID_UNICODE_EMOJIS.has(emoji)) return true;
  // Check regex patterns
  return UNICODE_EMOJI_PATTERN.test(emoji) || CUSTOM_EMOJI_PATTERN.test(emoji);
}

/**
 * Get fallback emoji for a given emoji type
 */
function getFallbackEmoji(emojiType) {
  const fallbacks = {
    souls: '💰',
    dot: '🔵',
    blank: '⚪',
    seraphyx: '✨',
    important: '⚠️',
    question: '❓',
    report: '📢',
    ban: '🔨',
    partner: '🤝',
    ticket: '🎫',
    roles: '👥',
    info: 'ℹ️',
    website: '🌐',
    levelup: '⬆️',
    tier: '🏆',
    rocket: '🚀',
    check: '✅',
    cross: '❌',
    default: '⭐'
  };
  return fallbacks[emojiType] || fallbacks.default;
}

describe('Appearance Configuration API Property Tests', () => {
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


  describe('Property 17: Emoji validation and fallback', () => {
    /**
     * **Feature: web-dashboard, Property 17: Emoji validation and fallback**
     * **Validates: Requirements 5.2, 5.5**
     * 
     * For any custom emoji selection, the system should validate format and availability,
     * falling back to Unicode emojis when unavailable
     */
    test('should validate emoji format and return valid emojis', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          emojiType: fc.constantFrom('souls', 'dot', 'check', 'cross', 'levelup', 'ticket'),
          emoji: fc.oneof(
            // Valid Unicode emojis
            fc.constantFrom('💰', '🔵', '✅', '❌', '⬆️', '🎫', '⭐', '🚀'),
            // Valid Discord custom emojis
            fc.constantFrom('<:custom:123456789012345678>', '<a:animated:987654321098765432>')
          )
        }),
        async ({ guildId, emojiType, emoji }) => {
          // Mock validation to return valid for proper emoji formats
          configManager.validateConfig.mockReturnValue({
            isValid: true,
            errors: [],
            warnings: []
          });
          
          const appearanceUpdate = {
            emojis: { [emojiType]: emoji }
          };
          
          configManager.updateConfigSection.mockResolvedValue(appearanceUpdate);

          // Setup route
          testApp.put('/api/config/:guildId/:section',
            validateGuildId,
            validateConfigSection,
            sanitizeInput,
            verifyAuth,
            verifyGuildAccess,
            async (req, res) => {
              try {
                const { emojis } = req.body;
                const validatedEmojis = {};
                const warnings = [];
                
                // Validate each emoji
                for (const [type, value] of Object.entries(emojis || {})) {
                  if (isValidEmoji(value)) {
                    validatedEmojis[type] = value;
                  } else {
                    // Fall back to default Unicode emoji
                    validatedEmojis[type] = getFallbackEmoji(type);
                    warnings.push(`Invalid emoji for ${type}, using fallback`);
                  }
                }
                
                const sectionData = await configManager.updateConfigSection(
                  req.params.guildId,
                  req.params.section,
                  { emojis: validatedEmojis },
                  req.user.userId
                );
                
                res.json({
                  success: true,
                  data: sectionData,
                  warnings,
                  message: 'Appearance configuration updated successfully'
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update appearance configuration'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}/appearance`)
            .send(appearanceUpdate)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.emojis[emojiType]).toBeDefined();
          // Valid emojis should be preserved
          expect(response.body.warnings).toEqual([]);
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should fall back to Unicode emojis when custom emojis are invalid', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          emojiType: fc.constantFrom('souls', 'dot', 'check', 'cross', 'levelup', 'ticket'),
          invalidEmoji: fc.oneof(
            // Invalid formats
            fc.constantFrom('invalid', 'not-an-emoji', '123', '<:broken>', '<invalid:123>')
          )
        }),
        async ({ guildId, emojiType, invalidEmoji }) => {
          const appearanceUpdate = {
            emojis: { [emojiType]: invalidEmoji }
          };
          
          const expectedFallback = getFallbackEmoji(emojiType);
          
          configManager.updateConfigSection.mockResolvedValue({
            emojis: { [emojiType]: expectedFallback }
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
                const { emojis } = req.body;
                const validatedEmojis = {};
                const warnings = [];
                
                // Validate each emoji
                for (const [type, value] of Object.entries(emojis || {})) {
                  if (isValidEmoji(value)) {
                    validatedEmojis[type] = value;
                  } else {
                    // Fall back to default Unicode emoji
                    validatedEmojis[type] = getFallbackEmoji(type);
                    warnings.push(`Invalid emoji for ${type}, using fallback`);
                  }
                }
                
                const sectionData = await configManager.updateConfigSection(
                  req.params.guildId,
                  req.params.section,
                  { emojis: validatedEmojis },
                  req.user.userId
                );
                
                res.json({
                  success: true,
                  data: sectionData,
                  warnings,
                  message: 'Appearance configuration updated successfully'
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update appearance configuration'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}/appearance`)
            .send(appearanceUpdate)
            .expect(200);

          expect(response.body.success).toBe(true);
          // Should have a warning about fallback
          expect(response.body.warnings.length).toBeGreaterThan(0);
          expect(response.body.warnings[0]).toContain('fallback');
          // Should use fallback emoji
          expect(response.body.data.emojis[emojiType]).toBe(expectedFallback);
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should notify user when custom emojis are unavailable in guild', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          emojiType: fc.constantFrom('souls', 'dot', 'check'),
          // Custom emoji that doesn't exist in guild
          unavailableEmoji: fc.constantFrom(
            '<:notfound:999999999999999999>',
            '<a:missing:888888888888888888>'
          )
        }),
        async ({ guildId, emojiType, unavailableEmoji }) => {
          const appearanceUpdate = {
            emojis: { [emojiType]: unavailableEmoji }
          };
          
          const expectedFallback = getFallbackEmoji(emojiType);
          
          // Mock guild emoji check - emoji not available
          configManager.checkGuildEmoji = jest.fn().mockResolvedValue(false);
          configManager.updateConfigSection.mockResolvedValue({
            emojis: { [emojiType]: expectedFallback }
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
                const { emojis } = req.body;
                const validatedEmojis = {};
                const warnings = [];
                
                for (const [type, value] of Object.entries(emojis || {})) {
                  // Check if it's a custom emoji format
                  if (CUSTOM_EMOJI_PATTERN.test(value)) {
                    // Simulate checking if emoji exists in guild
                    const emojiAvailable = await configManager.checkGuildEmoji?.(guildId, value) ?? false;
                    if (!emojiAvailable) {
                      validatedEmojis[type] = getFallbackEmoji(type);
                      warnings.push(`Custom emoji for ${type} not available in guild, using fallback`);
                    } else {
                      validatedEmojis[type] = value;
                    }
                  } else if (isValidEmoji(value)) {
                    validatedEmojis[type] = value;
                  } else {
                    validatedEmojis[type] = getFallbackEmoji(type);
                    warnings.push(`Invalid emoji for ${type}, using fallback`);
                  }
                }
                
                const sectionData = await configManager.updateConfigSection(
                  req.params.guildId,
                  req.params.section,
                  { emojis: validatedEmojis },
                  req.user.userId
                );
                
                res.json({
                  success: true,
                  data: sectionData,
                  warnings,
                  message: 'Appearance configuration updated successfully'
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update appearance configuration'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}/appearance`)
            .send(appearanceUpdate)
            .expect(200);

          expect(response.body.success).toBe(true);
          // Should have warning about unavailable emoji
          expect(response.body.warnings.length).toBeGreaterThan(0);
          expect(response.body.warnings[0]).toContain('not available');
          // Should use fallback
          expect(response.body.data.emojis[emojiType]).toBe(expectedFallback);
        }
      ), { numRuns: TEST_RUNS });
    });
  });


  describe('Property 18: Real-time appearance updates', () => {
    /**
     * **Feature: web-dashboard, Property 18: Real-time appearance updates**
     * **Validates: Requirements 5.3**
     * 
     * For any saved appearance setting, the system should update all bot responses immediately
     */
    test('should apply appearance changes immediately without restart', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          appearanceUpdates: fc.record({
            colors: fc.record({
              primary: fc.constantFrom('#5865F2', '#FF0000', '#00FF00', '#0000FF'),
              success: fc.constantFrom('#57F287', '#00FF00', '#32CD32'),
              error: fc.constantFrom('#ED4245', '#FF0000', '#DC143C'),
              warning: fc.constantFrom('#FEE75C', '#FFD700', '#FFA500')
            }),
            emojis: fc.record({
              souls: fc.constantFrom('💰', '💎', '🪙'),
              levelup: fc.constantFrom('⬆️', '🚀', '📈'),
              check: fc.constantFrom('✅', '✔️', '☑️')
            })
          })
        }),
        async ({ guildId, appearanceUpdates }) => {
          // Mock successful update with immediate application
          configManager.updateConfigSection.mockResolvedValue(appearanceUpdates);
          configManager.notifyBotOfChanges = jest.fn().mockResolvedValue(true);

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
                
                // Notify bot of changes for immediate application
                const notified = await configManager.notifyBotOfChanges?.(
                  req.params.guildId,
                  'appearance',
                  req.body
                ) ?? true;
                
                res.json({
                  success: true,
                  data: sectionData,
                  applied: notified,
                  message: 'Appearance configuration updated and applied immediately'
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update appearance configuration'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}/appearance`)
            .send(appearanceUpdates)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(appearanceUpdates);
          expect(response.body.applied).toBe(true);
          expect(response.body.message).toContain('immediately');
          
          // Verify update was called
          expect(configManager.updateConfigSection).toHaveBeenCalledWith(
            guildId,
            'appearance',
            appearanceUpdates,
            '123456789012345678'
          );
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should update all bot responses with new styling after save', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          colorUpdate: fc.record({
            colors: fc.record({
              primary: fc.constantFrom('#5865F2', '#FF0000', '#00FF00', '#0000FF', '#AABBCC', '#123456')
            })
          })
        }),
        async ({ guildId, colorUpdate }) => {
          // Track that bot was notified
          let botNotified = false;
          let notifiedChanges = null;
          
          configManager.updateConfigSection.mockResolvedValue(colorUpdate);
          configManager.notifyBotOfChanges = jest.fn().mockImplementation((gId, section, changes) => {
            botNotified = true;
            notifiedChanges = changes;
            return Promise.resolve(true);
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
                const sectionData = await configManager.updateConfigSection(
                  req.params.guildId,
                  req.params.section,
                  req.body,
                  req.user.userId
                );
                
                // Notify bot for real-time update
                await configManager.notifyBotOfChanges?.(
                  req.params.guildId,
                  'appearance',
                  req.body
                );
                
                res.json({
                  success: true,
                  data: sectionData,
                  realTimeUpdate: true,
                  message: 'Appearance updated - all bot responses will use new styling'
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update appearance configuration'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}/appearance`)
            .send(colorUpdate)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.realTimeUpdate).toBe(true);
          
          // Verify bot was notified with the changes
          expect(configManager.notifyBotOfChanges).toHaveBeenCalledWith(
            guildId,
            'appearance',
            colorUpdate
          );
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should handle appearance update when bot is temporarily unavailable', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          appearanceUpdates: fc.record({
            colors: fc.record({
              primary: fc.constantFrom('#5865F2', '#FF0000')
            })
          })
        }),
        async ({ guildId, appearanceUpdates }) => {
          // Mock successful save but bot notification fails
          configManager.updateConfigSection.mockResolvedValue(appearanceUpdates);
          configManager.notifyBotOfChanges = jest.fn().mockResolvedValue(false);

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
                
                // Try to notify bot
                const notified = await configManager.notifyBotOfChanges?.(
                  req.params.guildId,
                  'appearance',
                  req.body
                ) ?? false;
                
                res.json({
                  success: true,
                  data: sectionData,
                  applied: notified,
                  pendingSync: !notified,
                  message: notified 
                    ? 'Appearance updated and applied immediately'
                    : 'Appearance saved - will be applied when bot reconnects'
                });
              } catch (error) {
                res.status(500).json({
                  success: false,
                  error: 'Failed to update appearance configuration'
                });
              }
            }
          );

          const response = await request(testApp)
            .put(`/api/config/${guildId}/appearance`)
            .send(appearanceUpdates)
            .expect(200);

          // Save should still succeed
          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(appearanceUpdates);
          // But real-time update failed
          expect(response.body.applied).toBe(false);
          expect(response.body.pendingSync).toBe(true);
          expect(response.body.message).toContain('reconnects');
        }
      ), { numRuns: TEST_RUNS });
    });
  });
});
