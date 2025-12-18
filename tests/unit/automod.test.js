/**
 * AutoMod Unit Tests
 */

// Mock logger
jest.mock('../../util/logger', () => ({
    log: jest.fn(),
    logError: jest.fn()
}));

describe('AutoMod', () => {
    let automod;
    
    beforeEach(() => {
        jest.resetModules();
        automod = require('../../util/automod');
        // Reset config to defaults
        automod.config.enabled = true;
        automod.messageCache.clear();
        automod.exemptUsers.clear();
        automod.exemptChannels.clear();
        automod.exemptRoles.clear();
    });

    describe('checkSpam', () => {
        const createMockMessage = (content, userId = 'user1') => ({
            author: { id: userId, bot: false, tag: 'User#0000' },
            content,
            channel: { id: 'channel1' },
            guild: { id: 'guild1' },
            member: { roles: { cache: new Map() } },
            mentions: { users: { size: 0 }, roles: { size: 0 }, everyone: false }
        });

        it('should not flag first message as spam', () => {
            const message = createMockMessage('Hello world');
            const result = automod.checkSpam(message);
            expect(result.violation).toBe(false);
        });

        it('should flag rapid duplicate messages as spam', () => {
            const message = createMockMessage('spam message');
            
            // Send same message multiple times rapidly
            for (let i = 0; i < 5; i++) {
                automod.checkSpam(message);
            }
            
            const result = automod.checkSpam(message);
            expect(result.violation).toBe(true);
            expect(result.type).toBe('spam');
        });
    });


    describe('checkMentions', () => {
        it('should flag excessive mentions', () => {
            const message = {
                mentions: {
                    users: { size: 10 },
                    roles: { size: 0 },
                    everyone: false
                }
            };
            
            const result = automod.checkMentions(message);
            expect(result.violation).toBe(true);
            expect(result.type).toBe('mentions');
        });

        it('should not flag normal mentions', () => {
            const message = {
                mentions: {
                    users: { size: 2 },
                    roles: { size: 0 },
                    everyone: false
                }
            };
            
            const result = automod.checkMentions(message);
            expect(result.violation).toBe(false);
        });
    });

    describe('checkCaps', () => {
        it('should flag excessive caps', () => {
            const message = { content: 'THIS IS ALL CAPS MESSAGE HERE' };
            const result = automod.checkCaps(message);
            expect(result.violation).toBe(true);
            expect(result.type).toBe('caps');
        });

        it('should not flag normal messages', () => {
            const message = { content: 'This is a normal message' };
            const result = automod.checkCaps(message);
            expect(result.violation).toBe(false);
        });

        it('should not flag short messages', () => {
            const message = { content: 'HI' };
            const result = automod.checkCaps(message);
            expect(result.violation).toBe(false);
        });
    });

    describe('checkInvites', () => {
        it('should flag Discord invites', () => {
            const message = { content: 'Join my server: discord.gg/abc123' };
            const result = automod.checkInvites(message);
            expect(result.violation).toBe(true);
            expect(result.type).toBe('invite');
        });

        it('should not flag normal messages', () => {
            const message = { content: 'Hello world!' };
            const result = automod.checkInvites(message);
            expect(result.violation).toBe(false);
        });
    });

    describe('checkZalgo', () => {
        it('should flag zalgo text', () => {
            const zalgo = 'H̷̢̧̛̛̛̛̛̛e̷̢̧̛̛̛̛̛̛l̷̢̧̛̛̛̛̛̛l̷̢̧̛̛̛̛̛̛ơ̷̢̧̛̛̛̛̛';
            const message = { content: zalgo };
            const result = automod.checkZalgo(message);
            expect(result.violation).toBe(true);
        });

        it('should not flag normal text', () => {
            const message = { content: 'Hello world!' };
            const result = automod.checkZalgo(message);
            expect(result.violation).toBe(false);
        });
    });

    describe('isExempt', () => {
        it('should exempt users in exempt list', () => {
            automod.exemptUsers.add('user1');
            const message = {
                author: { id: 'user1' },
                channel: { id: 'channel1' },
                member: { roles: { cache: new Map() } }
            };
            expect(automod.isExempt(message)).toBe(true);
        });

        it('should exempt channels in exempt list', () => {
            automod.exemptChannels.add('channel1');
            const message = {
                author: { id: 'user1' },
                channel: { id: 'channel1' },
                member: { roles: { cache: new Map() } }
            };
            expect(automod.isExempt(message)).toBe(true);
        });
    });

    describe('badWords', () => {
        it('should add and detect bad words', () => {
            automod.addBadWord('badword');
            const message = { content: 'This contains badword here' };
            const result = automod.checkBadWords(message);
            expect(result.violation).toBe(true);
        });

        it('should remove bad words', () => {
            automod.addBadWord('testword');
            automod.removeBadWord('testword');
            const message = { content: 'This contains testword' };
            const result = automod.checkBadWords(message);
            expect(result.violation).toBe(false);
        });
    });

    describe('getStats', () => {
        it('should return statistics', () => {
            const stats = automod.getStats();
            expect(stats).toHaveProperty('enabled');
            expect(stats).toHaveProperty('config');
            expect(stats.config).toHaveProperty('spam');
        });
    });
});
