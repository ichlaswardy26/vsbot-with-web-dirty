/**
 * Simple Dashboard Test
 * Tests if the dashboard components can be loaded without errors
 */

const path = require('path');

console.log('🔍 Testing Dashboard Components...\n');

// Test 1: Check if main files exist
const requiredFiles = [
  'web/server.js',
  'web/controllers/dashboardController.js',
  'web/views/dashboard.html',
  'web/public/js/dashboard.js',
  'web/services/websocket.js',
  'web/services/cacheService.js',
  'web/services/auditLogger.js'
];

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  try {
    const fs = require('fs');
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MISSING`);
    }
  } catch (error) {
    console.log(`❌ ${file} - ERROR: ${error.message}`);
  }
});

console.log('\n🔧 Testing module imports:');

// Test 2: Try to require dashboard controller
try {
  const dashboardController = require('./web/controllers/dashboardController');
  console.log('✅ Dashboard Controller - imports successfully');
  
  // Check if all required functions exist
  const requiredFunctions = [
    'getDashboardOverview',
    'getConfigurationAnalytics', 
    'getBotIntegrationStatus',
    'validateConfiguration',
    'getConfigurationSuggestions'
  ];
  
  requiredFunctions.forEach(func => {
    if (typeof dashboardController[func] === 'function') {
      console.log(`  ✅ ${func}()`);
    } else {
      console.log(`  ❌ ${func}() - MISSING`);
    }
  });
  
} catch (error) {
  console.log(`❌ Dashboard Controller - ERROR: ${error.message}`);
}

// Test 3: Try to require WebSocket service
try {
  const WebSocketService = require('./web/services/websocket');
  console.log('✅ WebSocket Service - imports successfully');
} catch (error) {
  console.log(`❌ WebSocket Service - ERROR: ${error.message}`);
}

// Test 4: Try to require cache service
try {
  const cacheService = require('./web/services/cacheService');
  console.log('✅ Cache Service - imports successfully');
} catch (error) {
  console.log(`❌ Cache Service - ERROR: ${error.message}`);
}

// Test 5: Try to require audit logger
try {
  const auditLogger = require('./web/services/auditLogger');
  console.log('✅ Audit Logger - imports successfully');
} catch (error) {
  console.log(`❌ Audit Logger - ERROR: ${error.message}`);
}

// Test 6: Check configuration
try {
  const config = require('./config');
  console.log('✅ Configuration - loads successfully');
  
  if (config.web) {
    console.log(`  ✅ Web config found - Port: ${config.web.port}`);
  } else {
    console.log('  ❌ Web config missing');
  }
} catch (error) {
  console.log(`❌ Configuration - ERROR: ${error.message}`);
}

console.log('\n🎯 Dashboard Test Complete!');
console.log('\nIf you see any ❌ errors above, those components need to be fixed.');
console.log('If all show ✅, the dashboard should be working properly.');