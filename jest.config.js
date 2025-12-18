module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/web/__tests__/setup.js',
    '/tests/setup.js',
    '/web/__tests__/websocket.test.js' // Skip due to socket.io mock issues - needs refactoring
  ],
  collectCoverageFrom: [
    'util/**/*.js',
    'web/**/*.js',
    'handlers/**/*.js',
    'schemas/**/*.js',
    '!web/__tests__/**',
    '!web/public/**',
    '!**/node_modules/**',
    '!tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 15000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};