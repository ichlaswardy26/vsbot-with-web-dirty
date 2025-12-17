/**
 * Global Error Handlers
 * Anti-crash system with comprehensive logging
 */

const logger = require('./util/logger');

// Anti Crash System with logging
process.on("unhandledRejection", async (reason, promise) => {
  console.error('Unhandled Rejection:', reason?.stack || reason, promise);
  await logger.logError(
    { message: reason?.message || 'Unhandled Promise Rejection', stack: reason?.stack },
    'PROCESS',
    { type: 'unhandledRejection' }
  );
});

process.on("uncaughtException", async (err, origin) => {
  console.error('Uncaught Exception:', err?.stack || err, origin);
  await logger.logError(
    err,
    'PROCESS',
    { type: 'uncaughtException', origin }
  );
});

process.on("uncaughtExceptionMonitor", async (err, origin) => {
  console.error('Uncaught Exception Monitor:', err?.stack || err, origin);
  await logger.logError(
    err,
    'PROCESS',
    { type: 'uncaughtExceptionMonitor', origin }
  );
});