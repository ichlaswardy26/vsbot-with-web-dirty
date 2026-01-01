#!/usr/bin/env node

/**
 * Verify CSP fixes are in place before Docker deployment
 */

const fs = require('fs');

console.log('🔍 Verifying CSP fixes before deployment...\n');

// Check security middleware
const securityFile = 'web/middleware/security.js';
if (!fs.existsSync(securityFile)) {
  console.log('❌ Security middleware file not found!');
  process.exit(1);
}

const securityContent = fs.readFileSync(securityFile, 'utf8');

const requiredCSPDirectives = [
  { name: 'scriptSrcAttr', pattern: /scriptSrcAttr:\s*\[.*"'unsafe-inline'".*\]/ },
  { name: 'styleSrcElem', pattern: /styleSrcElem:\s*\[.*"https:\/\/cdn\.jsdelivr\.net".*\]/ },
  { name: 'scriptSrcElem', pattern: /scriptSrcElem:\s*\[.*"https:\/\/cdn\.socket\.io".*\]/ },
  { name: 'unsafe-inline in scriptSrc', pattern: /scriptSrc:\s*\[.*"'unsafe-inline'".*\]/ },
  { name: 'unsafe-eval in scriptSrc', pattern: /scriptSrc:\s*\[.*"'unsafe-eval'".*\]/ },
  { name: 'cdn.jsdelivr.net in styleSrc', pattern: /styleSrc:\s*\[.*"https:\/\/cdn\.jsdelivr\.net".*\]/ },
  { name: 'cdnjs.cloudflare.com in styleSrc', pattern: /styleSrc:\s*\[.*"https:\/\/cdnjs\.cloudflare\.com".*\]/ }
];

console.log('📋 CSP Configuration Check:');
console.log('===========================');

let allCSPChecksPass = true;
requiredCSPDirectives.forEach(directive => {
  if (directive.pattern.test(securityContent)) {
    console.log(`✅ ${directive.name}`);
  } else {
    console.log(`❌ ${directive.name} - MISSING`);
    allCSPChecksPass = false;
  }
});

// Check dashboard.js for inline handlers
const dashboardFile = 'web/public/js/dashboard.js';
if (fs.existsSync(dashboardFile)) {
  const dashboardContent = fs.readFileSync(dashboardFile, 'utf8');
  
  console.log('\n📋 Inline Event Handler Check:');
  console.log('===============================');
  
  const inlineHandlers = ['onclick=', 'onload=', 'onerror='];
  let handlerIssues = false;
  
  inlineHandlers.forEach(handler => {
    const matches = (dashboardContent.match(new RegExp(handler, 'g')) || []).length;
    if (matches > 0) {
      console.log(`❌ Found ${matches} instances of ${handler}`);
      handlerIssues = true;
    } else {
      console.log(`✅ No ${handler} found`);
    }
  });
  
  if (!handlerIssues) {
    console.log('✅ All inline event handlers have been removed');
  }
} else {
  console.log('\n⚠️  Dashboard JS file not found - skipping inline handler check');
}

// Summary
console.log('\n📊 Summary:');
console.log('===========');

if (allCSPChecksPass && !handlerIssues) {
  console.log('🎉 All CSP fixes are in place!');
  console.log('✅ Ready for Docker deployment');
  console.log('\nNext steps:');
  console.log('1. Run: ./scripts/rebuild-with-csp-fix.sh');
  console.log('2. Or: ./scripts/rebuild-with-csp-fix.ps1 (Windows)');
  console.log('3. Clear browser cache after deployment');
  process.exit(0);
} else {
  console.log('❌ CSP fixes are incomplete!');
  console.log('\nRequired actions:');
  if (!allCSPChecksPass) {
    console.log('1. Apply CSP fixes: node apply-csp-fix.js');
  }
  if (handlerIssues) {
    console.log('2. Remove inline event handlers from dashboard.js');
  }
  console.log('3. Re-run this verification script');
  process.exit(1);
}