#!/usr/bin/env node

/**
 * Docker Health Check Script
 * Validates that the bot is running properly inside Docker container
 */

const http = require('http');
const fs = require('fs');

console.log('[Health Check] Starting Docker health check...');

// Check if the main process is running
function checkProcess() {
  try {
    // Check if package.json exists (basic file system check)
    if (!fs.existsSync('/app/package.json')) {
      console.log('[Health Check] ❌ Application files not found');
      process.exit(1);
    }
    
    // Check if node_modules exists
    if (!fs.existsSync('/app/node_modules')) {
      console.log('[Health Check] ❌ Dependencies not installed');
      process.exit(1);
    }
    
    console.log('[Health Check] ✅ Application files present');
    return true;
  } catch (error) {
    console.log(`[Health Check] ❌ File system check failed: ${error.message}`);
    process.exit(1);
  }
}

// Check webhook server health
function checkWebhookServer() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[Health Check] ✅ Webhook server responding');
          resolve(true);
        } else {
          console.log(`[Health Check] ⚠️ Webhook server returned ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`[Health Check] ⚠️ Webhook server not responding: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('[Health Check] ⚠️ Webhook server timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Check web dashboard health
function checkWebDashboard() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[Health Check] ✅ Web dashboard responding');
          resolve(true);
        } else {
          console.log(`[Health Check] ⚠️ Web dashboard returned ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`[Health Check] ⚠️ Web dashboard not responding: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('[Health Check] ⚠️ Web dashboard timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Main health check function
async function runHealthCheck() {
  try {
    // Basic file system checks
    checkProcess();
    
    // Wait a moment for servers to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check both servers
    const webhookHealthy = await checkWebhookServer();
    const dashboardHealthy = await checkWebDashboard();
    
    // Determine overall health
    if (webhookHealthy && dashboardHealthy) {
      console.log('[Health Check] ✅ All services healthy');
      process.exit(0);
    } else if (webhookHealthy || dashboardHealthy) {
      console.log('[Health Check] ⚠️ Partial service availability');
      // Still consider healthy if at least one service is running
      process.exit(0);
    } else {
      console.log('[Health Check] ❌ No services responding');
      process.exit(1);
    }
  } catch (error) {
    console.log(`[Health Check] ❌ Health check failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the health check
runHealthCheck();