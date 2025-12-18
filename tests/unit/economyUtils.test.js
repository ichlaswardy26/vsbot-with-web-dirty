/**
 * Economy Utils Unit Tests
 */

// Mock the UserBalance schema
jest.mock('../../schemas/UserBalance', () => {
    const mockData = new Map();
    
    return {
        findOne: jest.fn().mockImplementation(({ userId, guildId }) => {
            const key = `${userId}-${guildId}`;
            return Promise.resolve(mockData.get(key) || null);
        }),
        findOneAndUpdate: jest.fn().mockImplementation(({ userId, guildId }, update, options) => {
            const key = `${userId}-${guildId}`;
            let data = mockData.get(key) || { userId, guildId, cash: 0 };
            
            if (update.$inc) {
                data.cash = (data.cash || 0) + (update.$inc.cash || 0);
            }
            if (update.$set) {
                Object.assign(data, update.$set);
            }
            
            mockData.set(key, data);
            return Promise.resolve(data);
        }),
        create: jest.fn().mockImplementation((data) => {
            const key = `${data.userId}-${data.guildId}`;
            mockData.set(key, data);
            return Promise.resolve(data);
        }),
        // Helper to reset mock data
        __resetMockData: () => mockData.clear(),
        __getMockData: () => mockData
    };
});

describe('EconomyUtils', () => {
    let economyUtils;
    const UserBalance = require('../../schemas/UserBalance');
    
    beforeEach(() => {
        jest.resetModules();
        UserBalance.__resetMockData();
        economyUtils = require('../../util/economyUtils');
    });

    describe('formatNumber', () => {
        it('should format numbers with thousand separators', () => {
            expect(economyUtils.formatNumber(1000)).toBe('1,000');
            expect(economyUtils.formatNumber(1000000)).toBe('1,000,000');
        });

        it('should handle small numbers', () => {
            expect(economyUtils.formatNumber(0)).toBe('0');
            expect(economyUtils.formatNumber(999)).toBe('999');
        });

        it('should handle negative numbers', () => {
            expect(economyUtils.formatNumber(-1000)).toBe('-1,000');
        });
    });

    describe('getBalance', () => {
        it('should return 0 for new user', async () => {
            const balance = await economyUtils.getBalance('newuser', 'guild1');
            expect(balance).toBe(0);
        });

        it('should return existing balance', async () => {
            await economyUtils.addSouls('user1', 'guild1', 500);
            const balance = await economyUtils.getBalance('user1', 'guild1');
            expect(balance).toBe(500);
        });
    });

    describe('addSouls', () => {
        it('should add souls to user balance', async () => {
            await economyUtils.addSouls('user1', 'guild1', 100);
            const balance = await economyUtils.getBalance('user1', 'guild1');
            expect(balance).toBe(100);
        });

        it('should accumulate souls', async () => {
            await economyUtils.addSouls('user1', 'guild1', 100);
            await economyUtils.addSouls('user1', 'guild1', 50);
            const balance = await economyUtils.getBalance('user1', 'guild1');
            expect(balance).toBe(150);
        });

        it('should handle zero amount', async () => {
            await economyUtils.addSouls('user1', 'guild1', 0);
            const balance = await economyUtils.getBalance('user1', 'guild1');
            expect(balance).toBe(0);
        });
    });

    describe('removeSouls', () => {
        it('should remove souls from user balance', async () => {
            await economyUtils.addSouls('user1', 'guild1', 100);
            await economyUtils.removeSouls('user1', 'guild1', 30);
            const balance = await economyUtils.getBalance('user1', 'guild1');
            expect(balance).toBe(70);
        });

        it('should allow negative balance', async () => {
            await economyUtils.removeSouls('user1', 'guild1', 50);
            const balance = await economyUtils.getBalance('user1', 'guild1');
            expect(balance).toBe(-50);
        });
    });

    describe('hasEnoughSouls', () => {
        it('should return true when user has enough souls', async () => {
            await economyUtils.addSouls('user1', 'guild1', 100);
            const result = await economyUtils.hasEnoughSouls('user1', 'guild1', 50);
            expect(result).toBe(true);
        });

        it('should return false when user does not have enough souls', async () => {
            await economyUtils.addSouls('user1', 'guild1', 30);
            const result = await economyUtils.hasEnoughSouls('user1', 'guild1', 50);
            expect(result).toBe(false);
        });

        it('should return true when user has exact amount', async () => {
            await economyUtils.addSouls('user1', 'guild1', 50);
            const result = await economyUtils.hasEnoughSouls('user1', 'guild1', 50);
            expect(result).toBe(true);
        });
    });

    describe('getLevelUpReward', () => {
        it('should return reward based on level', () => {
            const reward1 = economyUtils.getLevelUpReward(1);
            const reward10 = economyUtils.getLevelUpReward(10);
            const reward50 = economyUtils.getLevelUpReward(50);
            
            expect(reward1).toBeGreaterThan(0);
            expect(reward10).toBeGreaterThan(reward1);
            expect(reward50).toBeGreaterThan(reward10);
        });

        it('should return consistent rewards for same level', () => {
            const reward1 = economyUtils.getLevelUpReward(5);
            const reward2 = economyUtils.getLevelUpReward(5);
            expect(reward1).toBe(reward2);
        });
    });

    describe('transferSouls', () => {
        it('should transfer souls between users', async () => {
            await economyUtils.addSouls('sender', 'guild1', 100);
            const result = await economyUtils.transferSouls('sender', 'receiver', 'guild1', 50);
            
            expect(result.success).toBe(true);
            
            const senderBalance = await economyUtils.getBalance('sender', 'guild1');
            const receiverBalance = await economyUtils.getBalance('receiver', 'guild1');
            
            expect(senderBalance).toBe(50);
            expect(receiverBalance).toBe(50);
        });

        it('should fail if sender has insufficient funds', async () => {
            await economyUtils.addSouls('sender', 'guild1', 30);
            const result = await economyUtils.transferSouls('sender', 'receiver', 'guild1', 50);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('insufficient_funds');
        });

        it('should fail if transferring to self', async () => {
            await economyUtils.addSouls('user1', 'guild1', 100);
            const result = await economyUtils.transferSouls('user1', 'user1', 'guild1', 50);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('self_transfer');
        });

        it('should fail if amount is zero or negative', async () => {
            await economyUtils.addSouls('sender', 'guild1', 100);
            
            const result1 = await economyUtils.transferSouls('sender', 'receiver', 'guild1', 0);
            expect(result1.success).toBe(false);
            
            const result2 = await economyUtils.transferSouls('sender', 'receiver', 'guild1', -10);
            expect(result2.success).toBe(false);
        });
    });
});
