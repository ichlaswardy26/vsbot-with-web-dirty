/**
 * Live Dashboard Test
 * Tests the dashboard endpoints to ensure they're working
 */

const https = require('https');
const http = require('http');

// Test configuration
const config = {
  host: '43.129.55.161',
  port: 3001,
  useHttps: false // Set to true if using HTTPS
};

console.log('🧪 Testing Dashboard Live...\n');

// Test endpoints
const endpoints = [
  { path: '/health', name: 'Health Check' },
  { path: '/api/csrf-token', name: 'CSRF Token' },
  { path: '/dashboard', name: 'Dashboard Page' },
  { path: '/auth/discord', name: 'Discord Auth' }
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const client = config.useHttps ? https : http;
    const options = {
      hostname: config.host,
      port: config.port,
      path: endpoint.path,
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'Dashboard-Test/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = {
          name: endpoint.name,
          path: endpoint.path,
          status: res.statusCode,
          success: res.statusCode < 400,
          headers: res.headers,
          data: data.substring(0, 200) // First 200 chars
        };
        resolve(result);
      });
    });

    req.on('error', (err) => {
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: 0,
        success: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: 0,
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log(`🌐 Testing dashboard at ${config.useHttps ? 'https' : 'http'}://${config.host}:${config.port}\n`);

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    
    const statusIcon = result.success ? '✅' : '❌';
    const statusText = result.status || 'FAIL';
    
    console.log(`${statusIcon} ${result.name.padEnd(20)} | ${statusText} | ${result.path}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else if (result.data && result.success) {
      // Show first line of response for successful requests
      const firstLine = result.data.split('\n')[0].trim();
      if (firstLine && firstLine.length > 0) {
        console.log(`   Response: ${firstLine.substring(0, 80)}...`);
      }
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  const successful = endpoints.length;
  const failed = endpoints.filter(async (ep) => {
    const result = await testEndpoint(ep);
    return !result.success;
  }).length;

  console.log('📊 Test Summary:');
  console.log(`   ✅ Successful: ${successful - failed}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Dashboard is working properly.');
    console.log(`🌐 Access dashboard at: ${config.useHttps ? 'https' : 'http'}://${config.host}:${config.port}/dashboard`);
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    console.log('💡 Common issues:');
    console.log('   - Dashboard not started: docker compose up -d');
    console.log('   - Port not accessible: check firewall settings');
    console.log('   - Service not ready: wait a few more seconds');
  }
}

// Run tests
runTests().catch(console.error);