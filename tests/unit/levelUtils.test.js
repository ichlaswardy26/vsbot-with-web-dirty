/**
 * Level Utils Unit Tests
 */

describe('LevelUtils', () => {
    let levelUtils;
    
    beforeEach(() => {
        jest.resetModules();
        levelUtils = require('../../util/levelUtils');
    });

    describe('getXpRequirement', () => {
        it('should return XP requirement for level 1', () => {
            const xp = levelUtils.getXpRequirement(1);
            expect(xp).toBeGreaterThan(0);
        });

        it('should increase XP requirement with level', () => {
            const xp1 = levelUtils.getXpRequirement(1);
            const xp5 = levelUtils.getXpRequirement(5);
            const xp10 = levelUtils.getXpRequirement(10);
            
            expect(xp5).toBeGreaterThan(xp1);
            expect(xp10).toBeGreaterThan(xp5);
        });

        it('should return consistent values', () => {
            const xp1 = levelUtils.getXpRequirement(10);
            const xp2 = levelUtils.getXpRequirement(10);
            expect(xp1).toBe(xp2);
        });

        it('should handle high levels', () => {
            const xp = levelUtils.getXpRequirement(100);
            expect(xp).toBeGreaterThan(0);
            expect(Number.isFinite(xp)).toBe(true);
        });
    });

    describe('getMessageXp', () => {
        it('should return XP for message', () => {
            const xp = levelUtils.getMessageXp('Hello world!');
            expect(xp).toBeGreaterThan(0);
        });

        it('should return XP within expected range', () => {
            const xp = levelUtils.getMessageXp('Test message');
            expect(xp).toBeGreaterThanOrEqual(15);
            expect(xp).toBeLessThanOrEqual(25);
        });

        it('should handle empty message', () => {
            const xp = levelUtils.getMessageXp('');
            expect(xp).toBeGreaterThanOrEqual(0);
        });

        it('should handle long messages', () => {
            const longMessage = 'a'.repeat(2000);
            const xp = levelUtils.getMessageXp(longMessage);
            expect(xp).toBeGreaterThan(0);
        });
    });

    describe('calculateLevel', () => {
        it('should return level 1 for 0 XP', () => {
            const level = levelUtils.calculateLevel(0);
            expect(level).toBe(1);
        });

        it('should increase level with XP', () => {
            const level1 = levelUtils.calculateLevel(0);
            const level2 = levelUtils.calculateLevel(1000);
            const level3 = levelUtils.calculateLevel(10000);
            
            expect(level2).toBeGreaterThanOrEqual(level1);
            expect(level3).toBeGreaterThanOrEqual(level2);
        });

        it('should handle large XP values', () => {
            const level = levelUtils.calculateLevel(1000000);
            expect(level).toBeGreaterThan(1);
            expect(Number.isFinite(level)).toBe(true);
        });
    });

    describe('getProgressToNextLevel', () => {
        it('should return progress percentage', () => {
            const progress = levelUtils.getProgressToNextLevel(50, 1);
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(100);
        });

        it('should return 0 for 0 XP', () => {
            const progress = levelUtils.getProgressToNextLevel(0, 1);
            expect(progress).toBe(0);
        });

        it('should approach 100 near level up', () => {
            const requirement = levelUtils.getXpRequirement(1);
            const progress = levelUtils.getProgressToNextLevel(requirement - 1, 1);
            expect(progress).toBeGreaterThan(90);
        });
    });

    describe('getTierName', () => {
        it('should return null for low levels', () => {
            const tier = levelUtils.getTierName(5);
            expect(tier).toBeNull();
        });

        it('should return Soulborne for level 11+', () => {
            const tier = levelUtils.getTierName(11);
            expect(tier).toBe('Soulborne');
        });

        it('should return Sovereign for level 20+', () => {
            const tier = levelUtils.getTierName(20);
            expect(tier).toBe('Sovereign');
        });

        it('should return Eldritch for level 30+', () => {
            const tier = levelUtils.getTierName(30);
            expect(tier).toBe('Eldritch');
        });

        it('should return Seraphim for level 40+', () => {
            const tier = levelUtils.getTierName(40);
            expect(tier).toBe('Seraphim');
        });

        it('should return Seraphix Ω for level 50+', () => {
            const tier = levelUtils.getTierName(50);
            expect(tier).toBe('Seraphix Ω');
        });

        it('should return highest tier for very high levels', () => {
            const tier = levelUtils.getTierName(100);
            expect(tier).toBe('Seraphix Ω');
        });
    });

    describe('isMilestoneLevel', () => {
        it('should return true for milestone levels', () => {
            expect(levelUtils.isMilestoneLevel(11)).toBe(true);
            expect(levelUtils.isMilestoneLevel(20)).toBe(true);
            expect(levelUtils.isMilestoneLevel(30)).toBe(true);
            expect(levelUtils.isMilestoneLevel(40)).toBe(true);
            expect(levelUtils.isMilestoneLevel(50)).toBe(true);
        });

        it('should return false for non-milestone levels', () => {
            expect(levelUtils.isMilestoneLevel(1)).toBe(false);
            expect(levelUtils.isMilestoneLevel(10)).toBe(false);
            expect(levelUtils.isMilestoneLevel(15)).toBe(false);
            expect(levelUtils.isMilestoneLevel(25)).toBe(false);
        });
    });
});
