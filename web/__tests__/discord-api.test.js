const fc = require('fast-check');
const { DiscordApiService, DiscordApiRateLimiter } = require('../services/discordApi');

// Reduce test runs for faster execution
const TEST_RUNS = 100;

// Clean up after all tests to prevent Jest hanging
afterAll(() => {
  // Clear any intervals that might be running
  jest.useRealTimers();
});

/**
 * Helper to create a mock Discord client
 */
function createMockClient(options = {}) {
  const {
    isReady = true,
    guilds = new Map(),
    userId = '999888777666555444'
  } = options;

  return {
    isReady: () => isReady,
    user: { id: userId },
    guilds: {
      cache: guilds
    }
  };
}

/**
 * Helper to create a mock guild
 */
function createMockGuild(options = {}) {
  const {
    id = '123456789012345678',
    name = 'Test Guild',
    roles = new Map(),
    channels = new Map(),
    members = new Map(),
    ownerId = '111222333444555666'
  } = options;

  return {
    id,
    name,
    ownerId,
    memberCount: members.size,
    roles: { cache: roles },
    channels: { cache: channels },
    members: { 
      cache: members,
      fetch: async (userId) => members.get(userId) || null
    }
  };
}

/**
 * Helper to create a mock role
 */
function createMockRole(options = {}) {
  const {
    id = '123456789012345678',
    name = 'Test Role',
    position = 1,
    permissions = { bitfield: BigInt(0), has: () => false, toArray: () => [] },
    managed = false,
    mentionable = false,
    hexColor = '#000000'
  } = options;

  return {
    id,
    name,
    position,
    permissions,
    managed,
    mentionable,
    hexColor
  };
}

/**
 * Helper to create a mock member
 */
function createMockMember(options = {}) {
  const {
    userId = '123456789012345678',
    roles = { highest: { id: '1', name: 'Role', position: 1 }, cache: new Map() },
    permissions = { has: () => false, toArray: () => [] }
  } = options;

  return {
    id: userId,
    roles,
    permissions
  };
}

/**
 * Create permissions object with specific permissions
 */
function createPermissions(permArray = []) {
  const permSet = new Set(permArray);
  return {
    bitfield: BigInt(permArray.length),
    has: (perm) => permSet.has(perm) || permSet.has('Administrator'),
    toArray: () => permArray
  };
}

describe('Discord API Integration Property Tests', () => {
  describe('Property 11: Role hierarchy validation', () => {
    /**
     * **Feature: web-dashboard, Property 11: Role hierarchy validation**
     * **Validates: Requirements 3.2**
     * 
     * For any role assignment to level tiers, the system should validate 
     * role hierarchy and permissions
     */
    test('should validate role hierarchy for level tier assignments', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          roleId: fc.constantFrom('111111111111111111', '222222222222222222', '333333333333333333'),
          level: fc.integer({ min: 1, max: 100 }),
          rolePosition: fc.integer({ min: 1, max: 50 }),
          botRolePosition: fc.integer({ min: 1, max: 50 }),
          isManaged: fc.boolean()
        }),
        async ({ guildId, roleId, level, rolePosition, botRolePosition, isManaged }) => {
          const service = new DiscordApiService();

          // Create mock role
          const mockRole = createMockRole({
            id: roleId,
            name: `Level ${level} Role`,
            position: rolePosition,
            managed: isManaged
          });

          // Create mock bot member with specific role position
          const botMember = createMockMember({
            userId: '999888777666555444',
            roles: {
              highest: { id: 'bot-role', name: 'Bot Role', position: botRolePosition },
              cache: new Map()
            }
          });

          // Create mock guild with roles and members
          const roles = new Map([[roleId, mockRole]]);
          const members = new Map([['999888777666555444', botMember]]);
          const mockGuild = createMockGuild({ id: guildId, roles, members });
          const guilds = new Map([[guildId, mockGuild]]);

          // Create mock client
          const mockClient = createMockClient({ guilds });
          service.setClient(mockClient);

          const result = await service.validateRoleHierarchy(guildId, roleId, level);

          // Property: Role hierarchy validation should be consistent
          // If role position >= bot position, validation should fail
          // If role is managed, validation should fail
          // Otherwise, validation should pass
          
          const canManage = rolePosition < botRolePosition && !isManaged;
          
          expect(result.valid).toBe(canManage);
          
          if (canManage) {
            expect(result.role).toBeDefined();
            expect(result.role.id).toBe(roleId);
            expect(result.role.canManage).toBe(true);
            expect(result.level).toBe(level);
          } else {
            expect(result.error).toBeDefined();
            // Note: hierarchy check happens before managed check in the implementation
            // so when both conditions fail, we get the hierarchy error first
            if (rolePosition >= botRolePosition) {
              expect(result.error).toContain('higher');
            } else if (isManaged) {
              expect(result.error).toContain('managed');
            }
          }
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should return error when Discord API is not connected', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          roleId: fc.constantFrom('111111111111111111', '222222222222222222'),
          level: fc.integer({ min: 1, max: 100 })
        }),
        async ({ guildId, roleId, level }) => {
          const service = new DiscordApiService();
          // Don't set client - API not connected

          const result = await service.validateRoleHierarchy(guildId, roleId, level);

          expect(result.valid).toBe(false);
          expect(result.apiConnected).toBe(false);
          expect(result.error).toContain('not connected');
        }
      ), { numRuns: TEST_RUNS });
    });
  });

  describe('Property 12: Staff role verification', () => {
    /**
     * **Feature: web-dashboard, Property 12: Staff role verification**
     * **Validates: Requirements 3.3**
     * 
     * For any staff role configuration, the system should verify 
     * roles exist and have appropriate permissions
     */
    test('should verify staff roles exist and have required permissions', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          roleId: fc.constantFrom('111111111111111111', '222222222222222222'),
          roleExists: fc.boolean(),
          hasRequiredPerms: fc.boolean(),
          requiredPermissions: fc.constantFrom(
            ['ManageMessages'],
            ['ManageMessages', 'KickMembers'],
            ['ManageMessages', 'BanMembers', 'KickMembers'],
            ['Administrator']
          )
        }),
        async ({ guildId, roleId, roleExists, hasRequiredPerms, requiredPermissions }) => {
          const service = new DiscordApiService();

          // Create mock role with or without required permissions
          const rolePerms = hasRequiredPerms ? requiredPermissions : [];
          const mockRole = createMockRole({
            id: roleId,
            name: 'Staff Role',
            permissions: createPermissions(rolePerms)
          });

          // Create mock guild - only add role if it should exist
          const roles = roleExists ? new Map([[roleId, mockRole]]) : new Map();
          const mockGuild = createMockGuild({ id: guildId, roles });
          const guilds = new Map([[guildId, mockGuild]]);

          const mockClient = createMockClient({ guilds });
          service.setClient(mockClient);

          const result = await service.verifyStaffRole(guildId, roleId, requiredPermissions);

          // Property: Staff role verification should be consistent
          // If role doesn't exist, validation should fail with exists: false
          // If role exists but lacks permissions, validation should fail with missing permissions
          // If role exists and has all permissions, validation should pass
          
          if (!roleExists) {
            expect(result.valid).toBe(false);
            expect(result.exists).toBe(false);
            expect(result.error).toContain('not found');
          } else if (!hasRequiredPerms && requiredPermissions.length > 0) {
            expect(result.valid).toBe(false);
            expect(result.exists).toBe(true);
            expect(result.missingPermissions).toBeDefined();
            expect(result.missingPermissions.length).toBeGreaterThan(0);
          } else {
            expect(result.valid).toBe(true);
            expect(result.exists).toBe(true);
            expect(result.role).toBeDefined();
            expect(result.role.id).toBe(roleId);
          }
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should return error when Discord API is not connected', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          roleId: fc.constantFrom('111111111111111111', '222222222222222222')
        }),
        async ({ guildId, roleId }) => {
          const service = new DiscordApiService();
          // Don't set client - API not connected

          const result = await service.verifyStaffRole(guildId, roleId, ['ManageMessages']);

          expect(result.valid).toBe(false);
          expect(result.apiConnected).toBe(false);
          expect(result.error).toContain('not connected');
        }
      ), { numRuns: TEST_RUNS });
    });
  });

  describe('Property 13: Role conflict detection', () => {
    /**
     * **Feature: web-dashboard, Property 13: Role conflict detection**
     * **Validates: Requirements 3.5**
     * 
     * For any conflicting role assignment, the system should warn user 
     * and suggest corrections
     */
    test('should detect duplicate role assignments across levels', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          sharedRoleId: fc.constantFrom('111111111111111111', '222222222222222222'),
          level1: fc.integer({ min: 1, max: 50 }),
          level2: fc.integer({ min: 51, max: 100 })
        }),
        async ({ guildId, sharedRoleId, level1, level2 }) => {
          const service = new DiscordApiService();

          // Create mock role
          const mockRole = createMockRole({
            id: sharedRoleId,
            name: 'Shared Role'
          });

          const roles = new Map([[sharedRoleId, mockRole]]);
          const mockGuild = createMockGuild({ id: guildId, roles });
          const guilds = new Map([[guildId, mockGuild]]);

          const mockClient = createMockClient({ guilds });
          service.setClient(mockClient);

          // Create config with duplicate role assignment
          const roleConfig = {
            level: {
              [level1]: sharedRoleId,
              [level2]: sharedRoleId // Same role for different levels
            }
          };

          const result = await service.detectRoleConflicts(guildId, roleConfig);

          // Property: Duplicate role assignments should be detected as conflicts
          expect(result.hasConflicts).toBe(true);
          expect(result.conflicts.length).toBeGreaterThan(0);
          
          const duplicateConflict = result.conflicts.find(c => c.type === 'duplicate_role');
          expect(duplicateConflict).toBeDefined();
          expect(duplicateConflict.roleId).toBe(sharedRoleId);
          expect(duplicateConflict.levels).toContain(String(level1));
          expect(duplicateConflict.levels).toContain(String(level2));
          expect(duplicateConflict.suggestion).toBeDefined();
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should detect missing roles in configuration', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          missingRoleId: fc.constantFrom('111111111111111111', '222222222222222222'),
          level: fc.integer({ min: 1, max: 100 })
        }),
        async ({ guildId, missingRoleId, level }) => {
          const service = new DiscordApiService();

          // Create guild with no roles (role doesn't exist)
          const roles = new Map();
          const mockGuild = createMockGuild({ id: guildId, roles });
          const guilds = new Map([[guildId, mockGuild]]);

          const mockClient = createMockClient({ guilds });
          service.setClient(mockClient);

          const roleConfig = {
            level: {
              [level]: missingRoleId
            }
          };

          const result = await service.detectRoleConflicts(guildId, roleConfig);

          // Property: Missing roles should be detected as conflicts
          expect(result.hasConflicts).toBe(true);
          expect(result.conflicts.length).toBeGreaterThan(0);
          
          const missingConflict = result.conflicts.find(c => c.type === 'missing_role');
          expect(missingConflict).toBeDefined();
          expect(missingConflict.roleId).toBe(missingRoleId);
          expect(missingConflict.level).toBe(String(level));
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should warn about managed roles', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          roleId: fc.constantFrom('111111111111111111', '222222222222222222'),
          level: fc.integer({ min: 1, max: 100 })
        }),
        async ({ guildId, roleId, level }) => {
          const service = new DiscordApiService();

          // Create managed role (bot/integration role)
          const mockRole = createMockRole({
            id: roleId,
            name: 'Bot Role',
            managed: true
          });

          const roles = new Map([[roleId, mockRole]]);
          const mockGuild = createMockGuild({ id: guildId, roles });
          const guilds = new Map([[guildId, mockGuild]]);

          const mockClient = createMockClient({ guilds });
          service.setClient(mockClient);

          const roleConfig = {
            level: {
              [level]: roleId
            }
          };

          const result = await service.detectRoleConflicts(guildId, roleConfig);

          // Property: Managed roles should generate warnings
          expect(result.warnings.length).toBeGreaterThan(0);
          
          const managedWarning = result.warnings.find(w => w.type === 'managed_role');
          expect(managedWarning).toBeDefined();
          expect(managedWarning.roleId).toBe(roleId);
          expect(managedWarning.message).toContain('managed');
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should warn about staff and level role overlap', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          sharedRoleId: fc.constantFrom('111111111111111111', '222222222222222222'),
          level: fc.integer({ min: 1, max: 100 }),
          staffType: fc.constantFrom('moderator', 'admin', 'helper')
        }),
        async ({ guildId, sharedRoleId, level, staffType }) => {
          const service = new DiscordApiService();

          const mockRole = createMockRole({
            id: sharedRoleId,
            name: 'Shared Role'
          });

          const roles = new Map([[sharedRoleId, mockRole]]);
          const mockGuild = createMockGuild({ id: guildId, roles });
          const guilds = new Map([[guildId, mockGuild]]);

          const mockClient = createMockClient({ guilds });
          service.setClient(mockClient);

          // Config where staff role overlaps with level role
          const roleConfig = {
            level: {
              [level]: sharedRoleId
            },
            staff: {
              [staffType]: sharedRoleId
            }
          };

          const result = await service.detectRoleConflicts(guildId, roleConfig);

          // Property: Staff/level role overlap should generate warnings
          expect(result.warnings.length).toBeGreaterThan(0);
          
          const overlapWarning = result.warnings.find(w => w.type === 'staff_level_overlap');
          expect(overlapWarning).toBeDefined();
          expect(overlapWarning.roleId).toBe(sharedRoleId);
          expect(overlapWarning.staffType).toBe(staffType);
          expect(overlapWarning.suggestion).toBeDefined();
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should return empty conflicts for valid configuration', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432'),
          role1Id: fc.constant('111111111111111111'),
          role2Id: fc.constant('222222222222222222'),
          role3Id: fc.constant('333333333333333333')
        }),
        async ({ guildId, role1Id, role2Id, role3Id }) => {
          const service = new DiscordApiService();

          // Create unique roles for each level
          const mockRole1 = createMockRole({ id: role1Id, name: 'Level 10 Role' });
          const mockRole2 = createMockRole({ id: role2Id, name: 'Level 20 Role' });
          const mockRole3 = createMockRole({ id: role3Id, name: 'Staff Role' });

          const roles = new Map([
            [role1Id, mockRole1],
            [role2Id, mockRole2],
            [role3Id, mockRole3]
          ]);
          const mockGuild = createMockGuild({ id: guildId, roles });
          const guilds = new Map([[guildId, mockGuild]]);

          const mockClient = createMockClient({ guilds });
          service.setClient(mockClient);

          // Valid config with unique roles
          const roleConfig = {
            level: {
              10: role1Id,
              20: role2Id
            },
            staff: {
              moderator: role3Id
            }
          };

          const result = await service.detectRoleConflicts(guildId, roleConfig);

          // Property: Valid configuration should have no conflicts
          expect(result.hasConflicts).toBe(false);
          expect(result.conflicts.length).toBe(0);
        }
      ), { numRuns: TEST_RUNS });
    });

    test('should return error when Discord API is not connected', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          guildId: fc.constantFrom('123456789012345678', '987654321098765432')
        }),
        async ({ guildId }) => {
          const service = new DiscordApiService();
          // Don't set client - API not connected

          const result = await service.detectRoleConflicts(guildId, { level: {} });

          expect(result.apiConnected).toBe(false);
          expect(result.error).toContain('not connected');
        }
      ), { numRuns: TEST_RUNS });
    });
  });
});
