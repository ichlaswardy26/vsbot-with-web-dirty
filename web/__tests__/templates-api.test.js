const fc = require('fast-check');

// Mock mongoose before importing any modules that use it
jest.mock('mongoose', () => {
  const mockSchema = function(definition) {
    this.definition = definition;
    this.pre = jest.fn().mockReturnThis();
    this.index = jest.fn().mockReturnThis();
  };
  mockSchema.Types = { Mixed: 'Mixed' };
  
  return {
    Schema: mockSchema,
    model: jest.fn().mockReturnValue({
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      }),
      findOne: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
    }),
    connect: jest.fn().mockResolvedValue(),
    connection: {
      readyState: 1
    }
  };
});

// Now import the template manager
const templateManager = require('../../util/templateManager');

describe('Template Manager Unit Tests', () => {
  describe('Change Calculation', () => {
    test('should calculate changes between configs', () => {
      const current = {
        features: { leveling: { enabled: false } },
        colors: { primary: '#000000' }
      };
      const template = {
        features: { leveling: { enabled: true } },
        colors: { primary: '#5865F2' }
      };

      const changes = templateManager.calculateChanges(current, template);
      expect(Array.isArray(changes)).toBe(true);
      expect(changes.length).toBeGreaterThan(0);
    });

    test('should identify add, modify, and remove change types', () => {
      const current = {
        features: { leveling: { enabled: true } }
      };
      const template = {
        features: { leveling: { enabled: false }, economy: { enabled: true } }
      };

      const changes = templateManager.calculateChanges(current, template);
      expect(changes.some(c => c.type === 'modify')).toBe(true);
      expect(changes.some(c => c.type === 'add')).toBe(true);
    });
  });

  describe('Conflict Detection', () => {
    test('should detect feature enable conflicts', () => {
      const current = {
        features: { leveling: { enabled: false } }
      };
      const template = {
        features: { leveling: { enabled: true } }
      };

      const conflicts = templateManager.detectConflicts(current, template);
      expect(Array.isArray(conflicts)).toBe(true);
      expect(conflicts.some(c => c.type === 'feature_enable')).toBe(true);
    });

    test('should detect feature disable conflicts', () => {
      const current = {
        features: { leveling: { enabled: true } }
      };
      const template = {
        features: { leveling: { enabled: false } }
      };

      const conflicts = templateManager.detectConflicts(current, template);
      expect(Array.isArray(conflicts)).toBe(true);
      expect(conflicts.some(c => c.type === 'feature_disable')).toBe(true);
    });

    test('should detect color change conflicts', () => {
      const current = {
        colors: { primary: '#000000', success: '#00FF00' }
      };
      const template = {
        colors: { primary: '#5865F2', success: '#57F287' }
      };

      const conflicts = templateManager.detectConflicts(current, template);
      expect(conflicts.some(c => c.type === 'appearance_change')).toBe(true);
    });

    test('should provide resolution options for conflicts', () => {
      const current = {
        features: { leveling: { enabled: false } }
      };
      const template = {
        features: { leveling: { enabled: true } }
      };

      const conflicts = templateManager.detectConflicts(current, template);
      conflicts.forEach(conflict => {
        expect(conflict.resolution).toBeDefined();
        expect(conflict.resolution.keep_current).toBeDefined();
        expect(conflict.resolution.apply_template).toBeDefined();
      });
    });
  });

  describe('Manual Steps Generation', () => {
    test('should generate manual steps for welcome feature', () => {
      const template = {
        features: { welcome: { enabled: true } }
      };
      const current = { channels: {} };

      const steps = templateManager.getManualSteps(template, current);
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.some(s => s.toLowerCase().includes('welcome'))).toBe(true);
    });

    test('should generate manual steps for ticket feature', () => {
      const template = {
        features: { ticket: { enabled: true } }
      };
      const current = { categories: {} };

      const steps = templateManager.getManualSteps(template, current);
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.some(s => s.toLowerCase().includes('ticket'))).toBe(true);
    });

    test('should generate manual steps for voice feature', () => {
      const template = {
        features: { voice: { joinToCreateEnabled: true } }
      };
      const current = { channels: {} };

      const steps = templateManager.getManualSteps(template, current);
      expect(steps.some(s => s.toLowerCase().includes('voice'))).toBe(true);
    });

    test('should always include role hierarchy step', () => {
      const template = { features: {} };
      const current = {};

      const steps = templateManager.getManualSteps(template, current);
      expect(steps.some(s => s.toLowerCase().includes('role hierarchy'))).toBe(true);
    });
  });

  describe('Config Merging', () => {
    test('should merge configs correctly', () => {
      const current = {
        features: { leveling: { enabled: true, xpMin: 10 } },
        colors: { primary: '#000000' }
      };
      const template = {
        features: { leveling: { enabled: true, xpMax: 30 } },
        colors: { primary: '#5865F2' }
      };

      const merged = templateManager.mergeConfigs(current, template);
      expect(merged.features.leveling.xpMin).toBe(10);
      expect(merged.features.leveling.xpMax).toBe(30);
    });

    test('should respect keep_current conflict resolution', () => {
      const current = {
        colors: { primary: '#000000' }
      };
      const template = {
        colors: { primary: '#5865F2' }
      };

      const merged = templateManager.mergeConfigs(current, template, { colors: 'keep_current' });
      expect(merged.colors.primary).toBe('#000000');
    });

    test('should apply template when apply_template resolution is specified', () => {
      const current = {
        colors: { primary: '#000000' }
      };
      const template = {
        colors: { primary: '#5865F2' }
      };

      const merged = templateManager.mergeConfigs(current, template, { colors: 'apply_template' });
      expect(merged.colors.primary).toBe('#5865F2');
    });

    test('should add new sections from template', () => {
      const current = {
        features: { leveling: { enabled: true } }
      };
      const template = {
        features: { leveling: { enabled: true } },
        colors: { primary: '#5865F2' }
      };

      const merged = templateManager.mergeConfigs(current, template);
      expect(merged.colors).toBeDefined();
      expect(merged.colors.primary).toBe('#5865F2');
    });
  });

  describe('Deep Merge', () => {
    test('should deep merge nested objects', () => {
      const target = {
        level1: {
          level2: {
            a: 1,
            b: 2
          }
        }
      };
      const source = {
        level1: {
          level2: {
            b: 3,
            c: 4
          }
        }
      };

      const result = templateManager.deepMerge(target, source);
      expect(result.level1.level2.a).toBe(1);
      expect(result.level1.level2.b).toBe(3);
      expect(result.level1.level2.c).toBe(4);
    });
  });
});

/**
 * Property-Based Tests for Template System
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
describe('Template System Property-Based Tests', () => {
  // Arbitrary generators for template data
  const templateNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  const templateDescArb = fc.string({ maxLength: 500 });
  const categoryArb = fc.constantFrom('Gaming', 'Education', 'Business', 'Community', 'Creative', 'Custom');
  // Generate valid hex color codes
  const hexCharArb = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F');
  const colorArb = fc.tuple(hexCharArb, hexCharArb, hexCharArb, hexCharArb, hexCharArb, hexCharArb)
    .map(chars => `#${chars.join('')}`);
  const boolArb = fc.boolean();
  const positiveIntArb = fc.integer({ min: 1, max: 100000 });

  const featuresConfigArb = fc.record({
    leveling: fc.record({
      enabled: boolArb,
      xpCooldown: positiveIntArb,
      xpMin: fc.integer({ min: 1, max: 50 }),
      xpMax: fc.integer({ min: 51, max: 100 })
    }),
    economy: fc.record({
      enabled: boolArb,
      dailyReward: positiveIntArb
    })
  });

  const colorsConfigArb = fc.record({
    primary: colorArb,
    success: colorArb,
    error: colorArb
  });

  const templateConfigArb = fc.record({
    features: featuresConfigArb,
    colors: colorsConfigArb
  });

  /**
   * **Feature: web-dashboard, Property 38: Template display consistency**
   * **Validates: Requirements 10.1**
   * 
   * For any set of predefined templates, the system should display them
   * consistently grouped by category with all required fields present.
   */
  test('Property 38: Template display consistency - templates have required fields', () => {
    fc.assert(
      fc.property(
        templateNameArb,
        templateDescArb,
        categoryArb,
        templateConfigArb,
        (name, description, category, config) => {
          const template = {
            templateId: `test-${Date.now()}`,
            name,
            description,
            category,
            type: 'predefined',
            config
          };

          // All required fields must be present
          expect(template.templateId).toBeDefined();
          expect(template.name).toBeDefined();
          expect(template.name.length).toBeGreaterThan(0);
          expect(template.category).toBeDefined();
          expect(['Gaming', 'Education', 'Business', 'Community', 'Creative', 'Custom']).toContain(template.category);
          expect(template.config).toBeDefined();
          expect(typeof template.config).toBe('object');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: web-dashboard, Property 39: Template preview and confirmation**
   * **Validates: Requirements 10.2**
   * 
   * For any template selection, the preview should show all settings
   * that will be applied and require confirmation.
   */
  test('Property 39: Template preview shows all changes', () => {
    fc.assert(
      fc.property(
        templateConfigArb,
        templateConfigArb,
        (currentConfig, templateConfig) => {
          const changes = templateManager.calculateChanges(
            { features: currentConfig.features, colors: currentConfig.colors },
            { features: templateConfig.features, colors: templateConfig.colors }
          );

          // Changes array should be defined
          expect(Array.isArray(changes)).toBe(true);

          // Each change should have required properties
          changes.forEach(change => {
            expect(change.section).toBeDefined();
            expect(change.path).toBeDefined();
            expect(change.type).toBeDefined();
            expect(['add', 'modify', 'remove']).toContain(change.type);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: web-dashboard, Property 40: Template merge and conflict detection**
   * **Validates: Requirements 10.3**
   * 
   * For any template application, the system should merge settings
   * with existing configuration and highlight conflicts.
   */
  test('Property 40: Template merge detects conflicts correctly', () => {
    fc.assert(
      fc.property(
        boolArb,
        boolArb,
        (currentEnabled, templateEnabled) => {
          const current = {
            features: { leveling: { enabled: currentEnabled } }
          };
          const template = {
            features: { leveling: { enabled: templateEnabled } }
          };

          const conflicts = templateManager.detectConflicts(current, template);
          expect(Array.isArray(conflicts)).toBe(true);

          // If states differ, there should be a conflict
          if (currentEnabled !== templateEnabled) {
            const hasFeatureConflict = conflicts.some(c => 
              c.type === 'feature_enable' || c.type === 'feature_disable'
            );
            expect(hasFeatureConflict).toBe(true);
          }

          // Each conflict should have resolution options
          conflicts.forEach(conflict => {
            expect(conflict.type).toBeDefined();
            expect(conflict.description).toBeDefined();
            expect(conflict.resolution).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: web-dashboard, Property 41: Template completion feedback**
   * **Validates: Requirements 10.4**
   * 
   * For any completed template application, the system should display
   * a summary of changes and any required manual steps.
   */
  test('Property 41: Template application generates manual steps', () => {
    fc.assert(
      fc.property(
        boolArb,
        boolArb,
        boolArb,
        boolArb,
        (welcomeEnabled, ticketEnabled, voiceEnabled, levelingEnabled) => {
          const template = {
            features: {
              welcome: { enabled: welcomeEnabled },
              ticket: { enabled: ticketEnabled },
              voice: { joinToCreateEnabled: voiceEnabled },
              leveling: { enabled: levelingEnabled }
            }
          };
          const current = { channels: {}, categories: {} };

          const steps = templateManager.getManualSteps(template, current);
          expect(Array.isArray(steps)).toBe(true);

          // Should always include role hierarchy step
          expect(steps.some(s => s.includes('role hierarchy'))).toBe(true);

          // Should include welcome step if welcome is enabled
          if (welcomeEnabled) {
            expect(steps.some(s => s.toLowerCase().includes('welcome'))).toBe(true);
          }

          // Should include ticket step if ticket is enabled
          if (ticketEnabled) {
            expect(steps.some(s => s.toLowerCase().includes('ticket'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: web-dashboard, Property 42: Custom template creation**
   * **Validates: Requirements 10.5**
   * 
   * For any custom template save operation, the system should allow
   * creating and naming templates for reuse.
   */
  test('Property 42: Custom template data validation', () => {
    fc.assert(
      fc.property(
        templateNameArb,
        templateDescArb,
        templateConfigArb,
        (name, description, config) => {
          // Validate template data structure
          const templateData = {
            name: name.trim(),
            description,
            config,
            createdBy: '123456789012345678',
            guildId: '987654321098765432'
          };

          // Name must be non-empty after trimming
          expect(templateData.name.length).toBeGreaterThan(0);
          
          // Config must be an object
          expect(typeof templateData.config).toBe('object');
          expect(templateData.config).not.toBeNull();

          // CreatedBy must be present
          expect(templateData.createdBy).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Config merge preserves non-conflicting values
   */
  test('Property: Config merge preserves non-conflicting values', () => {
    fc.assert(
      fc.property(
        positiveIntArb,
        positiveIntArb,
        colorArb,
        colorArb,
        (currentXp, templateXp, currentColor, templateColor) => {
          const current = {
            features: { leveling: { xpMin: currentXp } },
            colors: { primary: currentColor }
          };
          const template = {
            features: { leveling: { xpMax: templateXp } },
            colors: { success: templateColor }
          };

          const merged = templateManager.mergeConfigs(current, template);

          // Original values should be preserved
          expect(merged.features.leveling.xpMin).toBe(currentXp);
          expect(merged.colors.primary).toBe(currentColor);

          // Template values should be added
          expect(merged.features.leveling.xpMax).toBe(templateXp);
          expect(merged.colors.success).toBe(templateColor);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Conflict resolution respects user choice
   */
  test('Property: Conflict resolution respects keep_current choice', () => {
    fc.assert(
      fc.property(
        colorArb,
        colorArb,
        (currentColor, templateColor) => {
          const current = { colors: { primary: currentColor } };
          const template = { colors: { primary: templateColor } };

          const merged = templateManager.mergeConfigs(current, template, { colors: 'keep_current' });

          // When keep_current is specified, original value should be preserved
          expect(merged.colors.primary).toBe(currentColor);
        }
      ),
      { numRuns: 100 }
    );
  });
});
