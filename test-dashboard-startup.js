/**
 * Dashboard Startup Test
 * Tests if the web server can start without errors
 */

require('dotenv').config();

console.log('🚀 Testing Dashboard Startup...\n');

// Mock environment variables if not set
if (!process.env.TOKEN) {
  console.log('⚠️  Setting mock environment variables for testing...');
  process.env.TOKEN = 'mock_token_for_testing';
  process.env.CLIENT_ID = 'mock_client_id';
  process.env.GUILD_ID = 'mock_guild_id';
  process.env.MONGO_URI = 'mongodb://localhost:27017/test';
  process.env.SESSION_SECRET = 'test_secret';
  process.env.DISCORD_CLIENT_SECRET = 'mock_discord_secret';
  process.env.WEB_PORT = '3001';
}

async function testDashboardStartup() {
  try {
    console.log('📦 Loading configuration...');
    const config = require('./config');
    console.log('✅ Configuration loaded successfully');
    
    console.log('🔧 Loading web server...');
    const WebServer = require('./web/server');
    console.log('✅ Web server class loaded successfully');
    
    console.log('🌐 Testing web server initialization...');
    const webServer = new WebServer(null); // No Discord client for testing
    console.log('✅ Web server initialized successfully');
    
    console.log('⚙️  Testing middleware setup...');
    webServer.setupMiddleware();
    console.log('✅ Middleware setup completed');
    
    console.log('🛣️  Testing routes setup...');
    webServer.setupRoutes();
    console.log('✅ Routes setup completed');
    
    console.log('📊 Testing dashboard controller...');
    const dashboardController = require('./web/controllers/dashboardController');
    console.log('✅ Dashboard controller loaded successfully');
    
    console.log('🔌 Testing WebSocket service...');
    const WebSocketService = require('./web/services/websocket');
    console.log('✅ WebSocket service loaded successfully');
    
    console.log('\n🎉 Dashboard Startup Test PASSED!');
    console.log('✅ All components loaded successfully');
    console.log('✅ No critical errors found');
    console.log('\n📝 Next steps:');
    console.log('1. Set up proper environment variables');
    console.log('2. Connect to MongoDB database');
    console.log('3. Start the web server with: npm start');
    console.log('4. Access dashboard at: http://localhost:3001/dashboard');
    
  } catch (error) {
    console.error('\n❌ Dashboard Startup Test FAILED!');
    console.error('Error:', error.message);
    console.error('\n🔍 Stack trace:');
    console.error(error.stack);
    
    console.log('\n🛠️  Troubleshooting steps:');
    console.log('1. Check if all required files exist');
    console.log('2. Verify all dependencies are installed: npm install');
    console.log('3. Check for syntax errors in the files');
    console.log('4. Ensure environment variables are set');
  }
}

testDashboardStartup();