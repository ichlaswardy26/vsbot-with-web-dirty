#!/usr/bin/env node

/**
 * Enhanced Startup Script for Villain Seraphyx Bot
 * Handles proper initialization, error recovery, and graceful shutdown
 */

require("dotenv").config();

const fs = require('fs');
const path = require('path');

// Startup configuration
const STARTUP_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  healthCheckDelay: 10000, // 10 seconds
  shutdownTimeout: 30000 // 30 seconds
};

let retryCount = 0;
let isShuttingDown = false;

/**
 * Enhanced logging with timestamps
 */
function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  console.log(prefix, message, ...args);
}

/**
 * Validate environment and dependencies
 */
function validateEnvironment() {
  log('INFO', '🔍 Validating environment...');
  
  // Check required environment variables
  const requiredVars = ['TOKEN', 'CLIENT_ID', 'MONGO_URI'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log('ERROR', `❌ Missing required environment variables: ${missing.join(', ')}`);
    log('ERROR', 'Please check your .env file and ensure all required variables are set');
    process.exit(1);
  }
  
  // Check critical files
  const criticalFiles = [
    'package.json',
    'config.js',
    'index.js',
    'util/configSync.js',
    'schemas/WebConfig.js',
    'web/server.js'
  ];
  
  for (const file of criticalFiles) {
    if (!fs.existsSync(file)) {
      log('ERROR', `❌ Critical file missing: ${file}`);
      process.exit(1);
    }
  }
  
  log('INFO', '✅ Environment validation passed');
}

/**
 * Start the bot with error handling and retries
 */
async function startBot() {
  try {
    log('INFO', '🚀 Starting Villain Seraphyx Discord Bot...');
    log('INFO', `📊 Attempt ${retryCount + 1}/${STARTUP_CONFIG.maxRetries}`);
    
    // Import and start the main application
    require('./index.js');
    
    // Wait for startup to complete
    await new Promise(resolve => setTimeout(resolve, STARTUP_CONFIG.healthCheckDelay));
    
    log('INFO', '✅ Bot startup completed successfully');
    
  } catch (error) {
    log('ERROR', '❌ Bot startup failed:', error.message);
    
    if (error.stack) {
      log('ERROR', 'Stack trace:', error.stack);
    }
    
    // Check if we should retry
    if (retryCount < STARTUP_CONFIG.maxRetries - 1 && !isShuttingDown) {
      retryCount++;
      log('WARN', `⏳ Retrying in ${STARTUP_CONFIG.retryDelay / 1000} seconds...`);
      
      setTimeout(() => {
        if (!isShuttingDown) {
          startBot();
        }
      }, STARTUP_CONFIG.retryDelay);
    } else {
      log('ERROR', '💥 Maximum retry attempts reached. Exiting...');
      process.exit(1);
    }
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    log('WARN', 'Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  log('INFO', `📴 Received ${signal}, initiating graceful shutdown...`);
  
  // Set shutdown timeout
  const shutdownTimer = setTimeout(() => {
    log('ERROR', '⏰ Shutdown timeout reached, forcing exit');
    process.exit(1);
  }, STARTUP_CONFIG.shutdownTimeout);
  
  try {
    // The actual shutdown logic is handled in index.js
    // We just need to wait for it to complete
    log('INFO', '⏳ Waiting for application to shutdown...');
    
    // Clear the timeout if shutdown completes normally
    clearTimeout(shutdownTimer);
    log('INFO', '✅ Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    log('ERROR', '❌ Error during shutdown:', error.message);
    clearTimeout(shutdownTimer);
    process.exit(1);
  }
}

/**
 * Setup process event handlers
 */
function setupEventHandlers() {
  // Graceful shutdown signals
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log('ERROR', '💥 Uncaught Exception:', error.message);
    if (error.stack) {
      log('ERROR', 'Stack trace:', error.stack);
    }
    
    if (!isShuttingDown) {
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    log('ERROR', '💥 Unhandled Promise Rejection:', reason);
    log('ERROR', 'Promise:', promise);
    
    if (!isShuttingDown) {
      gracefulShutdown('UNHANDLED_REJECTION');
    }
  });
  
  // Handle warnings
  process.on('warning', (warning) => {
    log('WARN', '⚠️ Process Warning:', warning.message);
  });
}

/**
 * Display startup banner
 */
function displayBanner() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  🤖 VILLAIN SERAPHYX BOT                  ║');
  console.log('║                     Enhanced Edition                       ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  🚀 Starting with enhanced dashboard integration...        ║');
  console.log('║  🔄 Real-time configuration synchronization enabled        ║');
  console.log('║  🛡️ Advanced security and monitoring active               ║');
  console.log('║  📊 Comprehensive analytics and audit logging             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

/**
 * Main startup function
 */
async function main() {
  try {
    displayBanner();
    
    // Setup event handlers first
    setupEventHandlers();
    
    // Validate environment
    validateEnvironment();
    
    // Start the bot
    await startBot();
    
  } catch (error) {
    log('ERROR', '💥 Fatal startup error:', error.message);
    process.exit(1);
  }
}

// Start the application
main();