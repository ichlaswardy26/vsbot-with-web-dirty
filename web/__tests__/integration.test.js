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
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
    }),
    connect: jest.fn().mockResolvedValue(),
    connection: {
      readyState: 1
    }
  };
});

// Mock config with required clientId for Discord OAuth
jest.mock('../../config', () => ({
  clientId: 'test-client-id-123456789',
  ownerId: ['111111111111111111'],
  web: {
    discordClientSecret: 'test-client-secret',
    discordCallbackUrl: '/auth/discord/callback',
    sessionSecret: 'test-session-secret'
  }
}));

const WebServer = require('../server');
const mongoose = require('mongoose');

// Mock the Discord client
const mockClient = {
  isReady: () => true,
  guilds: {
    cache: {
      size: 1
    }
  }
};

describe('Web Server Integration Tests', () => {
  let webServer;

  beforeAll(async () => {
    // Mongoose is already mocked
  });

  afterAll(async () => {
    if (webServer) {
      await webServer.stop();
    }
    jest.restoreAllMocks();
  });

  test('should create web server instance', () => {
    webServer = new WebServer(mockClient);
    expect(webServer).toBeDefined();
    // Port may vary in test environment due to port conflicts
    expect(webServer.port).toBeGreaterThanOrEqual(3000);
  });

  test('should have health check endpoint', async () => {
    webServer = new WebServer(mockClient);
    
    // Mock the server.listen method to avoid actually starting the server
    const mockListen = jest.fn((port, callback) => {
      callback();
      return { close: jest.fn() };
    });
    
    webServer.app.listen = mockListen;
    
    const request = require('supertest');
    const response = await request(webServer.app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      bot: {
        status: 'ready',
        guilds: 1
      },
      websocket: null
    });
  });
});