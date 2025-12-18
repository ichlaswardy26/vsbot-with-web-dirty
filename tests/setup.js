/**
 * Jest Test Setup
 * Global configuration and mocks for testing
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'ERROR';

// Mock Discord.js Client
const mockClient = {
    user: {
        id: '123456789012345678',
        tag: 'TestBot#0000',
        username: 'TestBot'
    },
    guilds: {
        cache: new Map([
            ['987654321098765432', {
                id: '987654321098765432',
                name: 'Test Guild',
                members: {
                    cache: new Map(),
                    fetch: jest.fn()
                },
                channels: {
                    cache: new Map(),
                    fetch: jest.fn()
                },
                roles: {
                    cache: new Map()
                }
            }]
        ])
    },
    channels: {
        cache: new Map(),
        fetch: jest.fn()
    },
    users: {
        cache: new Map(),
        fetch: jest.fn()
    },
    commands: new Map(),
    config: {
        prefix: 'sera',
        guildId: '987654321098765432'
    },
    isReady: jest.fn().mockReturnValue(true),
    ws: { ping: 50 }
};

// Mock Discord.js Message
const createMockMessage = (overrides = {}) => ({
    id: '111111111111111111',
    content: '',
    author: {
        id: '222222222222222222',
        username: 'TestUser',
        tag: 'TestUser#0000',
        bot: false
    },
    member: {
        id: '222222222222222222',
        user: {
            id: '222222222222222222',
            username: 'TestUser'
        },
        roles: {
            cache: new Map(),
            highest: { position: 1 }
        },
        permissions: {
            has: jest.fn().mockReturnValue(false)
        },
        manageable: true
    },
    guild: {
        id: '987654321098765432',
        name: 'Test Guild',
        members: {
            cache: new Map(),
            fetch: jest.fn()
        },
        channels: {
            cache: new Map()
        },
        roles: {
            cache: new Map()
        }
    },
    channel: {
        id: '333333333333333333',
        name: 'test-channel',
        send: jest.fn().mockResolvedValue({}),
        isTextBased: jest.fn().mockReturnValue(true)
    },
    reply: jest.fn().mockResolvedValue({}),
    react: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    ...overrides
});

// Mock Discord.js Interaction
const createMockInteraction = (overrides = {}) => ({
    id: '444444444444444444',
    type: 2, // APPLICATION_COMMAND
    commandName: 'test',
    user: {
        id: '222222222222222222',
        username: 'TestUser',
        tag: 'TestUser#0000'
    },
    member: {
        id: '222222222222222222',
        permissions: {
            has: jest.fn().mockReturnValue(false)
        },
        roles: {
            cache: new Map()
        }
    },
    guild: {
        id: '987654321098765432',
        name: 'Test Guild'
    },
    channel: {
        id: '333333333333333333',
        send: jest.fn().mockResolvedValue({})
    },
    reply: jest.fn().mockResolvedValue({}),
    deferReply: jest.fn().mockResolvedValue({}),
    editReply: jest.fn().mockResolvedValue({}),
    followUp: jest.fn().mockResolvedValue({}),
    isCommand: jest.fn().mockReturnValue(true),
    isChatInputCommand: jest.fn().mockReturnValue(true),
    options: {
        getString: jest.fn(),
        getInteger: jest.fn(),
        getUser: jest.fn(),
        getMember: jest.fn(),
        getChannel: jest.fn(),
        getRole: jest.fn(),
        getBoolean: jest.fn(),
        getSubcommand: jest.fn()
    },
    ...overrides
});

// Mock MongoDB - preserve Schema and model functionality
jest.mock('mongoose', () => {
    const actualMongoose = jest.requireActual('mongoose');
    return {
        ...actualMongoose,
        Schema: actualMongoose.Schema,
        model: jest.fn((name, schema) => {
            // Return a mock model with common methods
            const MockModel = function(data) {
                Object.assign(this, data);
            };
            MockModel.find = jest.fn().mockResolvedValue([]);
            MockModel.findOne = jest.fn().mockResolvedValue(null);
            MockModel.findById = jest.fn().mockResolvedValue(null);
            MockModel.findOneAndUpdate = jest.fn().mockResolvedValue(null);
            MockModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
            MockModel.findOneAndDelete = jest.fn().mockResolvedValue(null);
            MockModel.findByIdAndDelete = jest.fn().mockResolvedValue(null);
            MockModel.create = jest.fn().mockResolvedValue({});
            MockModel.insertMany = jest.fn().mockResolvedValue([]);
            MockModel.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
            MockModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
            MockModel.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
            MockModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
            MockModel.countDocuments = jest.fn().mockResolvedValue(0);
            MockModel.aggregate = jest.fn().mockResolvedValue([]);
            MockModel.prototype.save = jest.fn().mockResolvedValue({});
            return MockModel;
        }),
        connect: jest.fn().mockResolvedValue({}),
        connection: {
            readyState: 1,
            on: jest.fn(),
            close: jest.fn().mockResolvedValue({})
        }
    };
});

// Global test utilities
global.mockClient = mockClient;
global.createMockMessage = createMockMessage;
global.createMockInteraction = createMockInteraction;

// Increase timeout for async tests
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});

// Console suppression for cleaner test output
const originalConsole = { ...console };
beforeAll(() => {
    console.log = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
    // Keep error and warn for debugging
});

afterAll(() => {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
});
