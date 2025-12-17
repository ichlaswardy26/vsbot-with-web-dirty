module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'web/**/*.js',
    '!web/__tests__/**',
    '!web/public/**',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/web/__tests__/setup.js'],
  testTimeout: 10000
};