/**
 * WebSocket Service Tests
 * Tests for real-time updates functionality
 * Requirements: 9.2, 9.4, 9.5
 */

// Mock Socket.IO Server - must be defined before require
const mockSocket = {
  id: 'test-socket-id',
  authenticated: true,
  userId: 'user123',
  username: 'TestUser',
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  on: jest.fn(),
  request: {
    session: {
      passport: {
        user: {
          id: 'user123',
          username: 'TestUser'
        }
      }
    }
  }
};

const mockIo = {
  use: jest.fn((middleware) => {
    if (typeof middleware === 'function') {
      middleware(mockSocket, jest.fn());
    }
  }),
  on: jest.fn((event, callback) => {
    if (event === 'connection') {
      mockIo._connectionCallback = callback;
    }
  }),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  engine: {
    use: jest.fn()
  },
  disconnectSockets: jest.fn(),
  close: jest.fn(),
  _connectionCallback: null,
  _mockSocket: mockSocket
};

// Mock socket.io BEFORE requiring the module
jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIo)
}));

// Mock config
jest.mock('../../config', () => ({
  web: {
    allowedOrigins: ['http://localhost:3001']
  }
}));

// Now require the module after mocks are set up
const { WebSocketService, resetWebSocketService } = require('../services/websocket');

describe('WebSocketService', () => {
  let wsService;
  let mockHttpServer;
  let mockClient;

  beforeEach(() => {
    resetWebSocketService();
    
    mockHttpServer = {
      on: jest.fn()
    };
    
    mockClient = {
      isReady: jest.fn().mockReturnValue(true),
      ws: { ping: 50 },
      guilds: {
        cache: {
          size: 5
        }
      }
    };
    
    wsService = new WebSocketService(mockHttpServer, mockClient);
  });

  afterEach(() => {
    if (wsService) {
      wsService.shutdown();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize Socket.IO server', () => {
      expect(wsService.io).toBeDefined();
    });

    test('should setup middleware', () => {
      expect(wsService.io.use).toHaveBeenCalled();
    });

    test('should setup connection handler', () => {
      expect(wsService.io.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('Bot Status', () => {
    /**
     * Requirements: 9.5
     */
    test('should return online status when bot is ready', () => {
      const status = wsService.getBotStatus();
      
      expect(status.status).toBe('online');
      expect(status.isOnline).toBe(true);
      expect(status.ping).toBe(50);
      expect(status.guilds).toBe(5);
    });

    test('should return offline status when bot is not ready', () => {
      mockClient.isReady.mockReturnValue(false);
      
      const status = wsService.getBotStatus();
      
      expect(status.status).toBe('offline');
      expect(status.isOnline).toBe(false);
    });

    test('should return slow status when ping is high', () => {
      mockClient.ws.ping = 600;
      
      const status = wsService.getBotStatus();
      
      expect(status.status).toBe('slow');
      expect(status.isOnline).toBe(true);
    });

    test('should return unknown status when client is null', () => {
      wsService.client = null;
      
      const status = wsService.getBotStatus();
      
      expect(status.status).toBe('unknown');
      expect(status.isOnline).toBe(false);
    });
  });

  describe('Guild Room Management', () => {
    test('should track users joining guild rooms', () => {
      const mockSocket = {
        id: 'socket1',
        userId: 'user1',
        username: 'User1',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };

      wsService.handleJoinGuild(mockSocket, { guildId: 'guild123' });

      expect(mockSocket.join).toHaveBeenCalledWith('guild:guild123');
      expect(wsService.guildRooms.has('guild123')).toBe(true);
      expect(wsService.connectedUsers.has('socket1')).toBe(true);
    });

    test('should track users leaving guild rooms', () => {
      const mockSocket = {
        id: 'socket1',
        userId: 'user1',
        username: 'User1',
        join: jest.fn(),
        leave: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };

      // First join
      wsService.handleJoinGuild(mockSocket, { guildId: 'guild123' });
      
      // Then leave
      wsService.handleLeaveGuild(mockSocket, { guildId: 'guild123' });

      expect(mockSocket.leave).toHaveBeenCalledWith('guild:guild123');
    });
  });

  describe('Configuration Broadcasting', () => {
    /**
     * Requirements: 9.2
     */
    test('should broadcast config changes to guild room', () => {
      wsService.broadcastConfigChange('guild123', 'channels', { welcome: '123' }, {
        userId: 'user1',
        username: 'User1'
      });

      expect(wsService.io.to).toHaveBeenCalledWith('guild:guild123');
      expect(wsService.io.emit).toHaveBeenCalledWith('config:updated', expect.objectContaining({
        guildId: 'guild123',
        section: 'channels',
        changes: { welcome: '123' }
      }));
    });

    test('should increment config version on broadcast', () => {
      const initialVersion = wsService.getConfigVersion('guild123');
      
      wsService.broadcastConfigChange('guild123', 'channels', {}, {});
      
      expect(wsService.getConfigVersion('guild123')).toBe(initialVersion + 1);
    });

    test('should broadcast config saved confirmation', () => {
      wsService.broadcastConfigSaved('guild123', 'roles', { admin: '456' });

      expect(wsService.io.to).toHaveBeenCalledWith('guild:guild123');
      expect(wsService.io.emit).toHaveBeenCalledWith('config:saved', expect.objectContaining({
        guildId: 'guild123',
        section: 'roles'
      }));
    });

    test('should broadcast config errors', () => {
      wsService.broadcastConfigError('guild123', 'features', new Error('Test error'));

      expect(wsService.io.to).toHaveBeenCalledWith('guild:guild123');
      expect(wsService.io.emit).toHaveBeenCalledWith('config:error', expect.objectContaining({
        guildId: 'guild123',
        section: 'features',
        error: 'Test error'
      }));
    });
  });

  describe('Concurrent User Handling', () => {
    /**
     * Requirements: 9.4
     */
    test('should track users editing sections', () => {
      const mockSocket = {
        id: 'socket1',
        userId: 'user1',
        username: 'User1',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };

      wsService.handleJoinGuild(mockSocket, { guildId: 'guild123' });
      wsService.handleEditingStart(mockSocket, { guildId: 'guild123', section: 'channels' });

      const users = wsService.getUsersEditingSection('guild123', 'channels');
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('User1');
    });

    test('should notify conflict when detected', () => {
      wsService.notifyConflict('guild123', {
        section: 'channels',
        user: { id: 'user1', username: 'User1' },
        changes: [{ field: 'welcome', newValue: '123' }]
      });

      expect(wsService.io.to).toHaveBeenCalledWith('guild:guild123');
      expect(wsService.io.emit).toHaveBeenCalledWith('config:conflict', expect.objectContaining({
        guildId: 'guild123',
        section: 'channels'
      }));
    });

    test('should return all users in a guild', () => {
      const mockSocket1 = {
        id: 'socket1',
        userId: 'user1',
        username: 'User1',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };
      const mockSocket2 = {
        id: 'socket2',
        userId: 'user2',
        username: 'User2',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };

      wsService.handleJoinGuild(mockSocket1, { guildId: 'guild123' });
      wsService.handleJoinGuild(mockSocket2, { guildId: 'guild123' });

      const users = wsService.getGuildUsers('guild123');
      expect(users).toHaveLength(2);
    });
  });

  describe('Statistics', () => {
    test('should return connection statistics', () => {
      const mockSocket = {
        id: 'socket1',
        userId: 'user1',
        username: 'User1',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };

      wsService.handleJoinGuild(mockSocket, { guildId: 'guild123' });

      const stats = wsService.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeGuilds).toBe(1);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on shutdown', () => {
      // Store reference to io before shutdown
      const io = wsService.io;
      
      wsService.shutdown();

      expect(io.disconnectSockets).toHaveBeenCalled();
      expect(io.close).toHaveBeenCalled();
      expect(wsService.connectedUsers.size).toBe(0);
      expect(wsService.guildRooms.size).toBe(0);
      expect(wsService.io).toBeNull();
    });
  });
});

// Ensure all timers are cleared after tests
afterAll(() => {
  jest.useRealTimers();
});
