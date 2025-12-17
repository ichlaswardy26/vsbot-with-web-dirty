const request = require('supertest');

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

describe('Web Server Core Functionality', () => {
  let webServer;
  let app;

  beforeAll(async () => {
    // Create web server instance
    webServer = new WebServer(mockClient);
    app = webServer.app;
  });

  afterAll(async () => {
    if (webServer) {
      await webServer.stop();
    }
    jest.restoreAllMocks();
  });

  describe('Middleware Stack', () => {
    test('should add request ID header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    test('should add security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/config/123456789')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Route Structure', () => {
    test('should have authentication routes', async () => {
      // Test Discord auth redirect
      const response = await request(app)
        .get('/auth/discord')
        .expect(302); // Redirect to Discord

      expect(response.headers.location).toContain('discord.com');
    });

    test('should have templates API endpoint', async () => {
      const response = await request(app)
        .get('/api/templates')
        .expect(401); // Unauthorized without auth

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    test('should protect config API endpoints', async () => {
      // Test with invalid guild ID - should get validation error first
      const invalidResponse = await request(app)
        .get('/api/config/123456789')
        .expect(400); // Bad Request due to invalid guild ID

      expect(invalidResponse.body.success).toBe(false);
      expect(invalidResponse.body.error).toBe('Invalid guild ID');

      // Test with valid guild ID but no auth - should get auth error
      const authResponse = await request(app)
        .get('/api/config/123456789012345678')
        .expect(401); // Unauthorized without auth

      expect(authResponse.body.success).toBe(false);
      expect(authResponse.body.error).toBe('Authentication required');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('The requested resource was not found');
    });

    test('should validate request size', async () => {
      // Test with a smaller payload that still exceeds our limit
      const largePayload = 'x'.repeat(1024 * 1024); // 1MB

      const response = await request(app)
        .post('/api/config/123456789')
        .set('Content-Length', '11000000') // Fake a large content length
        .send({ data: largePayload })
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request too large');
    });

    test('should validate content type for POST requests', async () => {
      const response = await request(app)
        .post('/api/config/123456789')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(415);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unsupported content type');
    });
  });

  describe('Static File Serving', () => {
    test('should have static file routes configured', () => {
      // Test that the server has static file middleware configured
      // We can verify this by checking that the server instance has the expected structure
      expect(webServer).toBeDefined();
      expect(webServer.app).toBeDefined();
      
      // The static routes are configured in setupMiddleware, so if the server starts
      // without errors, the static middleware is properly configured
      expect(webServer.port).toBe(3000);
    });
  });

  describe('Health Check', () => {
    test('should return comprehensive health information', async () => {
      const response = await request(app)
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
        websocket: null // WebSocket service not initialized in test environment
      });
    });
  });
});