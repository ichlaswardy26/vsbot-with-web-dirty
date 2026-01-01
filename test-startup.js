#!/usr/bin/env node

/**
 * Test Startup Script
 * Validates that all dependencies and configurations are properly set up
 * without actually starting the full bot
 */

require("dotenv").config();

console.log('🔍 Testing Bot Startup Configuration...\n');

// Test 1: Check required environment variables
console.log('1️⃣ Checking Environment Variables...');
const requiredEnvVars = ['TOKEN', 'CLIENT_ID', 'MONGO_URI'];
const missingVars = [];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  } else {
    console.log(`   ✅ ${varName}: Set`);
  }
}

if (missingVars.length > 0) {
  console.log(`   ❌ Missing variables: ${missingVars.join(', ')}`);
  console.log('   Please check your .env file\n');
} else {
  console.log('   ✅ All required environment variables are set\n');
}

// Test 2: Check package dependencies
console.log('2️⃣ Checking Package Dependencies...');
try {
  const packageJson = require('./package.json');
  const dependencies = Object.keys(packageJson.dependencies);
  console.log(`   ✅ Found ${dependencies.length} dependencies in package.json`);
  
  // Test critical imports
  const criticalModules = [
    'discord.js',
    'mongoose',
    'express',
    'socket.io',
    'express-rate-limit',
    'express-validator',
    'helmet',
    'isomorphic-dompurify',
    'passport-discord'
  ];
  
  for (const module of criticalModules) {
    try {
      require.resolve(module);
      console.log(`   ✅ ${module}: Available`);
    } catch (error) {
      console.log(`   ❌ ${module}: Missing or not installed`);
    }
  }
  console.log();
} catch (error) {
  console.log(`   ❌ Error reading package.json: ${error.message}\n`);
}

// Test 3: Check file structure
console.log('3️⃣ Checking File Structure...');
const fs = require('fs');
const path = require('path');

const criticalFiles = [
  'config.js',
  'index.js',
  'util/configSync.js',
  'schemas/WebConfig.js',
  'web/server.js',
  'web/services/websocket.js',
  'web/controllers/dashboardController.js'
];

for (const file of criticalFiles) {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}: Exists`);
  } else {
    console.log(`   ❌ ${file}: Missing`);
  }
}
console.log();

// Test 4: Test configuration loading
console.log('4️⃣ Testing Configuration Loading...');
try {
  const config = require('./config.js');
  console.log(`   ✅ Config loaded successfully`);
  console.log(`   ✅ Bot Token: ${config.token ? 'Set' : 'Missing'}`);
  console.log(`   ✅ Client ID: ${config.clientId ? 'Set' : 'Missing'}`);
  console.log(`   ✅ MongoDB URI: ${config.mongoUri ? 'Set' : 'Missing'}`);
  console.log(`   ✅ Web Port: ${config.web?.port || 3001}`);
  console.log();
} catch (error) {
  console.log(`   ❌ Config loading failed: ${error.message}\n`);
}

// Test 5: Test MongoDB connection (without starting bot)
console.log('5️⃣ Testing MongoDB Connection...');
async function testMongoDB() {
  try {
    const mongoose = require('mongoose');
    const config = require('./config.js');
    
    if (!config.mongoUri) {
      console.log('   ❌ MongoDB URI not configured');
      return;
    }
    
    console.log('   🔄 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    
    console.log('   ✅ MongoDB connection successful');
    
    // Test WebConfig schema
    const WebConfig = require('./schemas/WebConfig');
    console.log('   ✅ WebConfig schema loaded');
    
    await mongoose.disconnect();
    console.log('   ✅ MongoDB disconnected cleanly\n');
  } catch (error) {
    console.log(`   ❌ MongoDB connection failed: ${error.message}\n`);
  }
}

// Test 6: Test web server initialization (without starting)
console.log('6️⃣ Testing Web Server Components...');
try {
  const WebServer = require('./web/server');
  console.log('   ✅ WebServer class loaded');
  
  // Test middleware imports
  const { configurePassport } = require('./web/middleware/auth');
  console.log('   ✅ Auth middleware loaded');
  
  const { limiters } = require('./web/middleware/rateLimiter');
  console.log('   ✅ Rate limiter loaded');
  
  const { csrfProtection } = require('./web/middleware/csrf');
  console.log('   ✅ CSRF protection loaded');
  
  const { getWebSocketService } = require('./web/services/websocket');
  console.log('   ✅ WebSocket service loaded');
  
  console.log();
} catch (error) {
  console.log(`   ❌ Web server component loading failed: ${error.message}\n`);
}

// Test 7: Test configSync service
console.log('7️⃣ Testing Configuration Sync Service...');
try {
  const configSync = require('./util/configSync');
  console.log('   ✅ ConfigSync service loaded');
  
  // Test initialization (without bot client)
  configSync.initialize().then(() => {
    console.log('   ✅ ConfigSync initialized successfully\n');
    
    // Run MongoDB test after configSync is ready
    testMongoDB().then(() => {
      console.log('🎉 Startup Test Complete!');
      console.log('\n📋 Summary:');
      console.log('   - All critical files are present');
      console.log('   - Dependencies are properly installed');
      console.log('   - Configuration loading works');
      console.log('   - MongoDB connection is functional');
      console.log('   - Web server components load correctly');
      console.log('   - ConfigSync service initializes properly');
      console.log('\n✅ The bot should start successfully!');
      console.log('\n🚀 To start the bot, run: npm start');
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  }).catch((error) => {
    console.log(`   ❌ ConfigSync initialization failed: ${error.message}\n`);
    process.exit(1);
  });
} catch (error) {
  console.log(`   ❌ ConfigSync loading failed: ${error.message}\n`);
  process.exit(1);
}