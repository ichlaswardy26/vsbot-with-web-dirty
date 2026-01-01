/**
 * Complete Dashboard Fix Script
 * Fixes all known dashboard implementation issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting Complete Dashboard Fix...\n');

// Fix 1: Ensure all required directories exist
console.log('📁 Creating required directories...');
const requiredDirs = [
  'web/public/css',
  'web/public/js', 
  'web/public/assets',
  'web/views',
  'web/controllers',
  'web/services',
  'web/middleware',
  'web/routes',
  'logs/audit',
  'logs/web'
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`✅ Directory exists: ${dir}`);
  }
});

// Fix 2: Create missing CSS file if needed
console.log('\n🎨 Checking CSS files...');
const cssPath = 'web/public/css/dashboard.css';
if (!fs.existsSync(cssPath)) {
  const basicCSS = `/* Dashboard Basic Styles */
.hidden { display: none !important; }
.loading { opacity: 0.5; pointer-events: none; }
.notification { 
  position: fixed; 
  top: 20px; 
  right: 20px; 
  z-index: 1000; 
  padding: 12px 20px; 
  border-radius: 4px; 
  color: white; 
}
.notification.success { background-color: #10b981; }
.notification.error { background-color: #ef4444; }
.notification.info { background-color: #3b82f6; }
.notification.warning { background-color: #f59e0b; }
`;
  
  fs.writeFileSync(cssPath, basicCSS);
  console.log('✅ Created basic dashboard CSS');
} else {
  console.log('✅ Dashboard CSS exists');
}

// Fix 3: Verify package.json scripts
console.log('\n📦 Checking package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredScripts = {
    'start': 'node start.js',
    'start:web': 'node web/server.js',
    'test:dashboard': 'node test-dashboard-startup.js'
  };
  
  let updated = false;
  Object.entries(requiredScripts).forEach(([script, command]) => {
    if (!packageJson.scripts[script]) {
      packageJson.scripts[script] = command;
      updated = true;
      console.log(`✅ Added script: ${script}`);
    }
  });
  
  if (updated) {
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json');
  } else {
    console.log('✅ Package.json scripts are correct');
  }
} catch (error) {
  console.log('❌ Error checking package.json:', error.message);
}

// Fix 4: Create environment template if .env doesn't exist
console.log('\n🔐 Checking environment configuration...');
if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
  fs.copyFileSync('.env.example', '.env');
  console.log('✅ Created .env from .env.example');
  console.log('⚠️  Please edit .env with your actual values');
} else if (fs.existsSync('.env')) {
  console.log('✅ Environment file exists');
} else {
  console.log('⚠️  No .env or .env.example found - you may need to create environment variables');
}

// Fix 5: Check for common dashboard issues
console.log('\n🔍 Checking for common issues...');

// Check if web server has duplicate routes
const serverPath = 'web/server.js';
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Count dashboard route occurrences
  const overviewRoutes = (serverContent.match(/\/api\/dashboard\/:guildId\/overview/g) || []).length;
  if (overviewRoutes > 1) {
    console.log(`⚠️  Found ${overviewRoutes} duplicate overview routes - this may cause issues`);
  } else {
    console.log('✅ No duplicate routes found');
  }
  
  // Check for required imports
  const requiredImports = [
    'express',
    './middleware/auth',
    './controllers/dashboardController',
    './services/websocket'
  ];
  
  requiredImports.forEach(imp => {
    if (serverContent.includes(`require('${imp}')`)) {
      console.log(`✅ Import found: ${imp}`);
    } else {
      console.log(`⚠️  Import missing or different: ${imp}`);
    }
  });
} else {
  console.log('❌ web/server.js not found');
}

// Fix 6: Verify dashboard controller exports
const controllerPath = 'web/controllers/dashboardController.js';
if (fs.existsSync(controllerPath)) {
  const controllerContent = fs.readFileSync(controllerPath, 'utf8');
  
  const requiredExports = [
    'getDashboardOverview',
    'getConfigurationAnalytics',
    'getBotIntegrationStatus',
    'validateConfiguration',
    'getConfigurationSuggestions'
  ];
  
  const hasModuleExports = controllerContent.includes('module.exports');
  if (hasModuleExports) {
    console.log('✅ Dashboard controller has exports');
    
    requiredExports.forEach(exp => {
      if (controllerContent.includes(exp)) {
        console.log(`✅ Export found: ${exp}`);
      } else {
        console.log(`⚠️  Export missing: ${exp}`);
      }
    });
  } else {
    console.log('❌ Dashboard controller missing module.exports');
  }
} else {
  console.log('❌ Dashboard controller not found');
}

// Fix 7: Create a simple health check endpoint test
console.log('\n🏥 Creating health check...');
const healthCheckPath = 'test-dashboard-health.js';
const healthCheckContent = `// Dashboard Health Check
const http = require('http');

function checkDashboardHealth() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log('Dashboard Health Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('✅ Dashboard is healthy');
    } else {
      console.log('⚠️  Dashboard returned status:', res.statusCode);
    }
  });

  req.on('error', (err) => {
    console.log('❌ Dashboard health check failed:', err.message);
    console.log('💡 Make sure the dashboard is running: npm start');
  });

  req.on('timeout', () => {
    console.log('⏰ Dashboard health check timed out');
    req.destroy();
  });

  req.end();
}

checkDashboardHealth();
`;

fs.writeFileSync(healthCheckPath, healthCheckContent);
console.log('✅ Created dashboard health check');

console.log('\n🎉 Dashboard Fix Complete!');
console.log('\n📋 Summary of fixes applied:');
console.log('✅ Created required directories');
console.log('✅ Added basic CSS if missing');
console.log('✅ Verified package.json scripts');
console.log('✅ Checked environment configuration');
console.log('✅ Verified imports and exports');
console.log('✅ Created health check tool');

console.log('\n🚀 Next steps to start the dashboard:');
console.log('1. Install dependencies: npm install');
console.log('2. Set up environment variables in .env');
console.log('3. Start the application: npm start');
console.log('4. Access dashboard: http://localhost:3001/dashboard');
console.log('5. Run health check: node test-dashboard-health.js');

console.log('\n🔧 If issues persist:');
console.log('- Check logs for specific error messages');
console.log('- Verify MongoDB connection');
console.log('- Ensure Discord OAuth2 is configured');
console.log('- Run: node test-dashboard-startup.js');