/**
 * Tests for Error Handler Service
 * Validates error handling, logging, and recovery mechanisms
 */

const {
  ErrorCodes,
  ErrorMessages,
  WebDashboardError,
  ErrorHandler,
  errorHandler
} = require('../services/errorHandler');

describe('Error Handler Service', () => {
  describe('ErrorCodes', () => {
    test('should have authentication error codes', () => {
      expect(ErrorCodes.AUTH_REQUIRED).toBe('AUTH_1001');
      expect(ErrorCodes.AUTH_SESSION_EXPIRED).toBe('AUTH_1003');
      expect(ErrorCodes.AUTH_PERMISSION_DENIED).toBe('AUTH_1004');
    });

    test('should have validation error codes', () => {
      expect(ErrorCodes.VALIDATION_FAILED).toBe('VAL_2001');
      expect(ErrorCodes.VALIDATION_INVALID_INPUT).toBe('VAL_2002');
    });

    test('should have configuration error codes', () => {
      expect(ErrorCodes.CONFIG_NOT_FOUND).toBe('CFG_3001');
      expect(ErrorCodes.CONFIG_UPDATE_FAILED).toBe('CFG_3002');
    });

    test('should have Discord API error codes', () => {
      expect(ErrorCodes.DISCORD_API_ERROR).toBe('DISC_4001');
      expect(ErrorCodes.DISCORD_RATE_LIMITED).toBe('DISC_4002');
    });
  });

  describe('ErrorMessages', () => {
    test('should have user-friendly messages for all error codes', () => {
      expect(ErrorMessages[ErrorCodes.AUTH_REQUIRED]).toBeDefined();
      expect(ErrorMessages[ErrorCodes.AUTH_REQUIRED]).toContain('log in');
    });

    test('should have troubleshooting guidance', () => {
      expect(ErrorMessages[ErrorCodes.AUTH_SESSION_EXPIRED]).toContain('log in again');
    });
  });

  describe('WebDashboardError', () => {
    test('should create error with code and message', () => {
      const error = new WebDashboardError(ErrorCodes.AUTH_REQUIRED);
      
      expect(error.code).toBe(ErrorCodes.AUTH_REQUIRED);
      expect(error.message).toBe(ErrorMessages[ErrorCodes.AUTH_REQUIRED]);
      expect(error.name).toBe('WebDashboardError');
    });

    test('should allow custom message', () => {
      const customMessage = 'Custom error message';
      const error = new WebDashboardError(ErrorCodes.AUTH_REQUIRED, customMessage);
      
      expect(error.message).toBe(customMessage);
      expect(error.userMessage).toBe(ErrorMessages[ErrorCodes.AUTH_REQUIRED]);
    });

    test('should include details', () => {
      const details = { userId: '123', guildId: '456' };
      const error = new WebDashboardError(ErrorCodes.AUTH_PERMISSION_DENIED, null, details);
      
      expect(error.details).toEqual(details);
    });

    test('should identify recoverable errors', () => {
      const recoverableError = new WebDashboardError(ErrorCodes.DISCORD_RATE_LIMITED);
      const nonRecoverableError = new WebDashboardError(ErrorCodes.AUTH_PERMISSION_DENIED);
      
      expect(recoverableError.recoverable).toBe(true);
      expect(nonRecoverableError.recoverable).toBe(false);
    });

    test('should serialize to JSON correctly', () => {
      const error = new WebDashboardError(ErrorCodes.VALIDATION_FAILED, null, { field: 'test' });
      const json = error.toJSON();
      
      expect(json.success).toBe(false);
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(json.error.message).toBeDefined();
      expect(json.error.details).toEqual({ field: 'test' });
      expect(json.error.timestamp).toBeDefined();
    });
  });

  describe('ErrorHandler', () => {
    let handler;

    beforeEach(() => {
      handler = new ErrorHandler();
    });

    test('should create standardized errors', () => {
      const error = handler.createError(ErrorCodes.CONFIG_NOT_FOUND);
      
      expect(error).toBeInstanceOf(WebDashboardError);
      expect(error.code).toBe(ErrorCodes.CONFIG_NOT_FOUND);
    });

    test('should normalize MongoDB errors', () => {
      const mongoError = new Error('Duplicate key error');
      mongoError.name = 'MongoError';
      mongoError.code = 11000;
      
      const normalized = handler.normalizeError(mongoError);
      
      expect(normalized.code).toBe(ErrorCodes.DB_DUPLICATE_KEY);
    });

    test('should normalize validation errors', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = { field1: {}, field2: {} };
      
      const normalized = handler.normalizeError(validationError);
      
      expect(normalized.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(normalized.details.fields).toEqual(['field1', 'field2']);
    });

    test('should normalize timeout errors', () => {
      const timeoutError = new Error('Connection timed out');
      timeoutError.code = 'ETIMEDOUT';
      
      const normalized = handler.normalizeError(timeoutError);
      
      expect(normalized.code).toBe(ErrorCodes.SERVER_TIMEOUT);
    });

    test('should track retry attempts', () => {
      const requestId = 'test-request-1';
      const recoverableError = new WebDashboardError(ErrorCodes.DISCORD_RATE_LIMITED);
      
      expect(handler.shouldRetry(requestId, recoverableError)).toBe(true);
      expect(handler.shouldRetry(requestId, recoverableError)).toBe(true);
      expect(handler.shouldRetry(requestId, recoverableError)).toBe(true);
      expect(handler.shouldRetry(requestId, recoverableError)).toBe(false); // Max retries reached
    });

    test('should not retry non-recoverable errors', () => {
      const requestId = 'test-request-2';
      const nonRecoverableError = new WebDashboardError(ErrorCodes.AUTH_PERMISSION_DENIED);
      
      expect(handler.shouldRetry(requestId, nonRecoverableError)).toBe(false);
    });

    test('should calculate exponential backoff delay', () => {
      const requestId = 'test-request-3';
      const error = new WebDashboardError(ErrorCodes.DISCORD_RATE_LIMITED);
      
      handler.shouldRetry(requestId, error); // Attempt 1
      const delay1 = handler.getRetryDelay(requestId);
      
      handler.shouldRetry(requestId, error); // Attempt 2
      const delay2 = handler.getRetryDelay(requestId);
      
      expect(delay2).toBeGreaterThan(delay1);
    });

    test('should get error statistics', () => {
      const stats = handler.getErrorStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byCode');
      expect(stats).toHaveProperty('recoverable');
      expect(stats).toHaveProperty('nonRecoverable');
    });
  });

  describe('Singleton errorHandler', () => {
    test('should be an instance of ErrorHandler', () => {
      expect(errorHandler).toBeInstanceOf(ErrorHandler);
    });

    test('should handle errors and add to log', async () => {
      const error = new WebDashboardError(ErrorCodes.VALIDATION_FAILED);
      const context = { requestId: 'test-123', path: '/api/test' };
      
      const entry = await errorHandler.handleError(error, context);
      
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.context).toEqual(context);
    });

    test('should get recent errors', () => {
      const recentErrors = errorHandler.getRecentErrors(10);
      
      expect(Array.isArray(recentErrors)).toBe(true);
    });
  });
});
