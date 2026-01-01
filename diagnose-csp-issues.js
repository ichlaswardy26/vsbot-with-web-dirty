#!/usr/bin/env node

/**
 * Comprehensive CSP Issue Diagnosis and Fix Script
 * This script will help identify and resolve CSP violations
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 Diagnosing CSP Issues...\n');

// Check if required files exist
const requiredFiles = [
  'web/middleware/security.js',
  'web/public/js/dashboard.js',
  'web/views/dashboard.html',
  'web/server.js'
];

console.log('📁 Checking required files:');
let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all files are present.');
  process.exit(1);
}

// Check CSP configuration
console.log('\n🛡️  Checking CSP Configuration:');
const securityContent = fs.readFileSync('web/middleware/security.js', 'utf8');

const requiredCSPDirectives = [
  { name: 'scriptSrcAttr', pattern: /scriptSrcAttr:\s*\[.*"'unsafe-inline'".*\]/ },
  { name: 'styleSrcElem', pattern: /styleSrcElem:\s*\[.*"https:\/\/cdn\.jsdelivr\.net".*\]/ },
  { name: 'scriptSrcElem', pattern: /scriptSrcElem:\s*\[.*"https:\/\/cdn\.socket\.io".*\]/ },
  { name: 'unsafe-inline in scriptSrc', pattern: /scriptSrc:\s*\[.*"'unsafe-inline'".*\]/ },
  { name: 'unsafe-eval in scriptSrc', pattern: /scriptSrc:\s*\[.*"'unsafe-eval'".*\]/ }
];

let cspIssues = [];
requiredCSPDirectives.forEach(directive => {
  if (directive.pattern.test(securityContent)) {
    console.log(`✅ ${directive.name}`);
  } else {
    console.log(`❌ ${directive.name} - MISSING OR INCORRECT`);
    cspIssues.push(directive.name);
  }
});

// Check for inline event handlers
console.log('\n🎯 Checking for inline event handlers:');
const dashboardJsContent = fs.readFileSync('web/public/js/dashboard.js', 'utf8');
const dashboardHtmlContent = fs.readFileSync('web/views/dashboard.html', 'utf8');

const inlineHandlers = ['onclick=', 'onload=', 'onerror=', 'onmouseover=', 'onchange='];
let handlerIssues = [];

inlineHandlers.forEach(handler => {
  const jsMatches = (dashboardJsContent.match(new RegExp(handler, 'g')) || []).length;
  const htmlMatches = (dashboardHtmlContent.match(new RegExp(handler, 'g')) || []).length;
  
  if (jsMatches > 0 || htmlMatches > 0) {
    console.log(`❌ Found ${jsMatches + htmlMatches} instances of ${handler}`);
    handlerIssues.push(handler);
  } else {
    console.log(`✅ No ${handler} found`);
  }
});

// Check server configuration
console.log('\n⚙️  Checking server configuration:');
const serverContent = fs.readFileSync('web/server.js', 'utf8');

const serverChecks = [
  { name: 'Security headers middleware applied', pattern: /securityHeaders\(\)/ },
  { name: 'Security middleware imported', pattern: /require\(['"]\.\/middleware\/security['"]/ },
  { name: 'Helmet configured', pattern: /helmet\(/ }
];

serverChecks.forEach(check => {
  if (check.pattern.test(serverContent)) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name} - NOT FOUND`);
  }
});

// Generate fix recommendations
console.log('\n🔧 Fix Recommendations:');
console.log('========================');

if (cspIssues.length > 0) {
  console.log('\n📝 CSP Configuration Issues:');
  cspIssues.forEach(issue => {
    console.log(`   • Fix ${issue} in web/middleware/security.js`);
  });
  
  console.log('\n   Recommended CSP configuration:');
  console.log(`
   contentSecurityPolicy: {
     directives: {
       defaultSrc: ["'self'"],
       styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
       scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
       scriptSrcAttr: ["'unsafe-inline'"],
       styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
       scriptSrcElem: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
       imgSrc: ["'self'", "data:", "https:", "http:", "https://via.placeholder.com"],
       connectSrc: ["'self'", "wss:", "ws:", "https:", "http:"],
       fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
       objectSrc: ["'none'"],
       mediaSrc: ["'self'"],
       frameSrc: ["'none'"]
     }
   }`);
}

if (handlerIssues.length > 0) {
  console.log('\n📝 Inline Event Handler Issues:');
  console.log('   • Replace all inline event handlers with addEventListener');
  console.log('   • Use data attributes and event delegation');
  console.log('   • Remove onclick, onload, etc. from HTML and JS strings');
}

// Test server connectivity
console.log('\n🌐 Testing Server Connectivity:');
const testPorts = [3000, 3001, 8080];

async function testPort(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/health',
      timeout: 2000
    }, (res) => {
      resolve({ port, status: res.statusCode, available: true });
    });
    
    req.on('error', () => {
      resolve({ port, available: false });
    });
    
    req.on('timeout', () => {
      resolve({ port, available: false, timeout: true });
    });
    
    req.end();
  });
}

async function testConnectivity() {
  console.log('Testing common ports...');
  
  for (const port of testPorts) {
    const result = await testPort(port);
    if (result.available) {
      console.log(`✅ Port ${port}: Server responding (HTTP ${result.status})`);
    } else if (result.timeout) {
      console.log(`⏱️  Port ${port}: Timeout`);
    } else {
      console.log(`❌ Port ${port}: No server`);
    }
  }
}

// Browser cache clearing instructions
console.log('\n🧹 Browser Cache Clearing:');
console.log('==========================');
console.log('After making changes, clear browser cache:');
console.log('• Chrome: Ctrl+Shift+R (hard refresh)');
console.log('• Firefox: Ctrl+F5');
console.log('• Edge: Ctrl+Shift+R');
console.log('• Or open DevTools → Network → Disable cache');

// Next steps
console.log('\n🚀 Next Steps:');
console.log('===============');
console.log('1. Fix any issues identified above');
console.log('2. Restart the server: npm start or node start.js');
console.log('3. Clear browser cache and refresh dashboard');
console.log('4. Check browser console for remaining CSP errors');
console.log('5. Test with: node test-csp-fix.js');

// Summary
const totalIssues = cspIssues.length + handlerIssues.length;
console.log(`\n📊 Summary: ${totalIssues} issues found`);

if (totalIssues === 0) {
  console.log('🎉 No issues detected! If you\'re still seeing CSP errors:');
  console.log('   • Restart the server');
  console.log('   • Clear browser cache');
  console.log('   • Check for other CSP configurations');
} else {
  console.log('⚠️  Issues need to be resolved for CSP to work properly');
}

// Run connectivity test
testConnectivity().then(() => {
  console.log('\n✨ Diagnosis complete!');
  process.exit(totalIssues > 0 ? 1 : 0);
});