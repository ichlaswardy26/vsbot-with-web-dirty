#!/usr/bin/env node

/**
 * Restart Server and Test CSP Configuration
 * This script helps restart the server and verify CSP is working
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');

console.log('🔄 Server Restart and CSP Test Utility');
console.log('=====================================\n');

// Function to test if server is running
function testServer(port = 3001) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/health',
      timeout: 2000
    }, (res) => {
      resolve({ running: true, port, status: res.statusCode });
    });
    
    req.on('error', () => resolve({ running: false, port }));
    req.on('timeout', () => resolve({ running: false, port, timeout: true }));
    req.end();
  });
}

// Function to test CSP headers
function testCSP(port = 3001) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/dashboard',
      timeout: 5000
    }, (res) => {
      const csp = res.headers['content-security-policy'];
      resolve({ 
        success: true, 
        csp: csp,
        hasStyleSrcElem: csp && csp.includes('style-src-elem'),
        hasScriptSrcElem: csp && csp.includes('script-src-elem'),
        hasCDNs: csp && csp.includes('cdn.jsdelivr.net')
      });
    });
    
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => resolve({ success: false, error: 'timeout' }));
    req.end();
  });
}

async function main() {
  // Step 1: Check if server is currently running
  console.log('1️⃣  Checking current server status...');
  const serverStatus = await testServer();
  
  if (serverStatus.running) {
    console.log(`✅ Server is running on port ${serverStatus.port}`);
    
    // Test current CSP
    console.log('\n2️⃣  Testing current CSP configuration...');
    const cspTest = await testCSP();
    
    if (cspTest.success) {
      console.log('📋 Current CSP Header:');
      console.log(cspTest.csp ? cspTest.csp.substring(0, 200) + '...' : 'No CSP header found');
      
      console.log('\n🔍 CSP Analysis:');
      console.log(`   style-src-elem present: ${cspTest.hasStyleSrcElem ? '✅' : '❌'}`);
      console.log(`   script-src-elem present: ${cspTest.hasScriptSrcElem ? '✅' : '❌'}`);
      console.log(`   CDN domains allowed: ${cspTest.hasCDNs ? '✅' : '❌'}`);
      
      if (cspTest.hasStyleSrcElem && cspTest.hasScriptSrcElem && cspTest.hasCDNs) {
        console.log('\n🎉 CSP configuration looks correct!');
        console.log('If you\'re still seeing violations, try:');
        console.log('   • Clear browser cache (Ctrl+Shift+R)');
        console.log('   • Open dashboard in incognito mode');
        console.log('   • Check for browser extensions blocking resources');
        return;
      } else {
        console.log('\n⚠️  CSP configuration needs updating. Server restart required.');
      }
    } else {
      console.log('❌ Could not test CSP:', cspTest.error);
    }
  } else {
    console.log('❌ Server is not running');
  }

  // Step 2: Provide restart instructions
  console.log('\n3️⃣  Server Restart Required');
  console.log('============================');
  console.log('The CSP changes require a server restart. Please:');
  console.log('');
  console.log('🛑 Stop the current server:');
  console.log('   • If running in terminal: Press Ctrl+C');
  console.log('   • If running as service: Stop the service');
  console.log('   • If using PM2: pm2 restart all');
  console.log('');
  console.log('🚀 Start the server:');
  console.log('   npm start');
  console.log('   OR');
  console.log('   node start.js');
  console.log('   OR');
  console.log('   node index.js');
  console.log('');
  console.log('🧪 After restart, run this script again to verify CSP');

  // Step 3: Create a verification URL
  console.log('\n4️⃣  Quick Verification');
  console.log('======================');
  console.log('After restarting, visit your dashboard and check:');
  console.log('');
  console.log('✅ Expected behavior:');
  console.log('   • No CSP violation errors in browser console');
  console.log('   • Tailwind CSS styles load (page looks styled)');
  console.log('   • Font Awesome icons appear');
  console.log('   • Socket.IO connects (check network tab)');
  console.log('   • Charts render properly');
  console.log('');
  console.log('❌ If still seeing violations:');
  console.log('   • Clear browser cache completely');
  console.log('   • Try incognito/private browsing mode');
  console.log('   • Check browser console for specific errors');

  // Step 4: Create emergency CSP disable script
  const emergencyScript = `
// Emergency CSP Disable Script
// Use this ONLY if CSP is completely blocking the dashboard

const fs = require('fs');
const securityFile = 'web/middleware/security.js';

console.log('🚨 EMERGENCY: Temporarily disabling CSP...');

let content = fs.readFileSync(securityFile, 'utf8');
content = content.replace(
  /contentSecurityPolicy: \\{[\\s\\S]*?\\},/,
  'contentSecurityPolicy: false,'
);

fs.writeFileSync(securityFile, content);
console.log('✅ CSP disabled. Restart server and dashboard should work.');
console.log('⚠️  Remember to re-enable CSP for security!');
`;

  fs.writeFileSync('emergency-disable-csp.js', emergencyScript);
  console.log('\n🆘 Created emergency-disable-csp.js');
  console.log('   Use ONLY if CSP completely blocks dashboard');
  console.log('   Run: node emergency-disable-csp.js');

  console.log('\n✨ Restart your server now to apply CSP fixes!');
}

main().catch(console.error);