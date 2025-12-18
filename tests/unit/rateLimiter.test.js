/**
 * Rate Limiter Unit Tests
 */

// Mock config
jest.mock('../../config', () => ({
    ownerId: ['111111111111111111']
}));

// Mock rolePermissions
jest.mock('../../util/rolePermissions', () => ({
    isAdmin: jest.fn().mockReturnValue(false)
}));

describe('RateLimiter', () => {
    let rateLimiter;
    
    beforeEach(() => {
        jest.resetModules();
        rateLimiter = require('../../util/rateLimiter');
        // Clear internal state
        rateLimiter.cooldowns.clear();
        rateLimiter.rateLimits.clear();
    });

    describe('checkCooldown', () => {
        it('should allow first command execution', () => {
            const result = rateLimiter.checkCooldown('user1', 'test', 'general');
            expect(result.onCooldown).toBe(false);
        });

        it('should block command during cooldown', () => {
            // First execution
            rateLimiter.checkCooldown('user1', 'test', 'general');
            
            // Immediate second execution
            const result = rateLimiter.checkCooldown('user1', 'test', 'general');
            expect(result.onCooldown).toBe(true);
            expect(result.timeLeft).toBeGreaterThan(0);
        });

        it('should use category-specific cooldown', () => {
            // Admin category has 5 second cooldown
            rateLimiter.checkCooldown('user1', 'adminCmd', 'admin');
            const result = rateLimiter.checkCooldown('user1', 'adminCmd', 'admin');
            
            expect(result.onCooldown).toBe(true);
        });

        it('should allow different commands simultaneously', () => {
            rateLimiter.checkCooldown('user1', 'cmd1', 'general');
            const result = rateLimiter.checkCooldown('user1', 'cmd2', 'general');
            
            expect(result.onCooldown).toBe(false);
        });

        it('should track cooldowns per user', () => {
            rateLimiter.checkCooldown('user1', 'test', 'general');
            const result = rateLimiter.checkCooldown('user2', 'test', 'general');
            
            expect(result.onCooldown).toBe(false);
        });

        it('should respect custom cooldown', () => {
            rateLimiter.checkCooldown('user1', 'test', 'general', 10000);
            const result = rateLimiter.checkCooldown('user1', 'test', 'general', 10000);
            
            expect(result.onCooldown).toBe(true);
        });
    });

    describe('checkRateLimit', () => {
        it('should allow commands within rate limit', () => {
            const result = rateLimiter.checkRateLimit('user1', 'economy');
            expect(result.limited).toBe(false);
        });

        it('should block when rate limit exceeded', () => {
            // Economy has 20 uses per minute
            for (let i = 0; i < 20; i++) {
                rateLimiter.checkRateLimit('user1', 'economy');
            }
            
            const result = rateLimiter.checkRateLimit('user1', 'economy');
            expect(result.limited).toBe(true);
            expect(result.resetIn).toBeGreaterThan(0);
        });

        it('should track rate limits per user', () => {
            for (let i = 0; i < 20; i++) {
                rateLimiter.checkRateLimit('user1', 'economy');
            }
            
            const result = rateLimiter.checkRateLimit('user2', 'economy');
            expect(result.limited).toBe(false);
        });

        it('should return not limited for unknown category', () => {
            const result = rateLimiter.checkRateLimit('user1', 'unknown');
            expect(result.limited).toBe(false);
        });
    });

    describe('checkLimits', () => {
        it('should check both cooldown and rate limit', () => {
            const result = rateLimiter.checkLimits('user1', 'test', 'economy');
            expect(result.blocked).toBe(false);
        });

        it('should block if on cooldown', () => {
            rateLimiter.checkLimits('user1', 'test', 'economy');
            const result = rateLimiter.checkLimits('user1', 'test', 'economy');
            
            expect(result.blocked).toBe(true);
            expect(result.reason).toBe('cooldown');
        });

        it('should block if rate limited', () => {
            // Exhaust rate limit with different commands to avoid cooldown
            for (let i = 0; i < 21; i++) {
                rateLimiter.checkRateLimit('user1', 'economy');
            }
            
            // Now check limits - should be rate limited
            const result = rateLimiter.checkLimits('user1', 'newcmd', 'economy');
            expect(result.blocked).toBe(true);
            expect(result.reason).toBe('rateLimit');
        });
    });

    describe('getRemainingCooldown', () => {
        it('should return 0 when no cooldown', () => {
            const remaining = rateLimiter.getRemainingCooldown('user1', 'test', 'general');
            expect(remaining).toBe(0);
        });

        it('should return remaining time when on cooldown', () => {
            rateLimiter.checkCooldown('user1', 'test', 'general');
            const remaining = rateLimiter.getRemainingCooldown('user1', 'test', 'general');
            
            expect(remaining).toBeGreaterThan(0);
        });
    });

    describe('resetCooldown', () => {
        it('should reset cooldown for user command', () => {
            rateLimiter.checkCooldown('user1', 'test', 'general');
            rateLimiter.resetCooldown('user1', 'test');
            
            const result = rateLimiter.checkCooldown('user1', 'test', 'general');
            expect(result.onCooldown).toBe(false);
        });
    });

    describe('resetRateLimit', () => {
        it('should reset rate limit for user category', () => {
            for (let i = 0; i < 20; i++) {
                rateLimiter.checkRateLimit('user1', 'economy');
            }
            
            rateLimiter.resetRateLimit('user1', 'economy');
            
            const result = rateLimiter.checkRateLimit('user1', 'economy');
            expect(result.limited).toBe(false);
        });
    });

    describe('getRateLimitStatus', () => {
        it('should return status for category', () => {
            rateLimiter.checkRateLimit('user1', 'economy');
            rateLimiter.checkRateLimit('user1', 'economy');
            
            const status = rateLimiter.getRateLimitStatus('user1', 'economy');
            
            expect(status.uses).toBe(2);
            expect(status.maxUses).toBe(20);
            expect(status.percentage).toBe(10);
        });

        it('should return null for unknown category', () => {
            const status = rateLimiter.getRateLimitStatus('user1', 'unknown');
            expect(status).toBeNull();
        });

        it('should return zero uses for new user', () => {
            const status = rateLimiter.getRateLimitStatus('newuser', 'economy');
            expect(status.uses).toBe(0);
        });
    });

    describe('getStats', () => {
        it('should return statistics', () => {
            rateLimiter.checkCooldown('user1', 'test', 'general');
            rateLimiter.checkRateLimit('user1', 'economy');
            
            const stats = rateLimiter.getStats();
            
            expect(stats.activeCooldowns).toBeGreaterThan(0);
            expect(stats.activeRateLimits).toBeGreaterThan(0);
            expect(stats.categories).toContain('general');
            expect(stats.rateLimitCategories).toContain('economy');
        });
    });

    describe('isExempt', () => {
        it('should exempt bot owners', () => {
            const member = {
                user: { id: '111111111111111111' }
            };
            
            const result = rateLimiter.isExempt(member);
            expect(result).toBe(true);
        });

        it('should exempt admins', () => {
            // Get fresh reference to mocked module
            const rolePermissions = require('../../util/rolePermissions');
            rolePermissions.isAdmin.mockReturnValue(true);
            
            const member = {
                user: { id: '222222222222222222' }
            };
            
            const result = rateLimiter.isExempt(member);
            expect(result).toBe(true);
            
            // Reset mock after test
            rolePermissions.isAdmin.mockReturnValue(false);
        });

        it('should not exempt regular users', () => {
            // Ensure mock returns false for regular users
            const rolePermissions = require('../../util/rolePermissions');
            rolePermissions.isAdmin.mockReturnValue(false);
            
            const member = {
                user: { id: '333333333333333333' }
            };
            
            const result = rateLimiter.isExempt(member);
            expect(result).toBe(false);
        });
    });

    describe('setCustomCooldown', () => {
        it('should set custom cooldown for command', () => {
            rateLimiter.setCustomCooldown('specialCmd', 60000);
            
            rateLimiter.checkCooldown('user1', 'specialCmd', 'specialCmd');
            const remaining = rateLimiter.getRemainingCooldown('user1', 'specialCmd', 'specialCmd');
            
            expect(remaining).toBeGreaterThan(50); // Should be close to 60 seconds
        });
    });
});
