#!/usr/bin/env node

/**
 * Force CSP Fix - Directly modify security middleware to ensure correct CSP
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying forced CSP fix...');

const securityFile = 'web/middleware/security.js';

if (!fs.existsSync(securityFile)) {
  console.error('❌ Security middleware file not found');
  process.exit(1);
}

// Read current content
let content = fs.readFileSync(securityFile, 'utf8');

// Define the correct CSP configuration
const correctCSPConfig = `  return helmet({
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
    },`;

// Find and replace the helmet configuration
const helmetRegex = /return helmet\(\{[\s\S]*?contentSecurityPolicy:\s*\{[\s\S]*?\},/;

if (helmetRegex.test(content)) {
  content = content.replace(helmetRegex, correctCSPConfig);
  console.log('✅ Updated existing CSP configuration');
} else {
  console.log('❌ Could not find existing CSP configuration to replace');
  process.exit(1);
}

// Write the updated content
fs.writeFileSync(securityFile, content, 'utf8');

console.log('✅ CSP configuration has been forcefully updated');
console.log('');
console.log('🔄 Next steps:');
console.log('1. Restart your server');
console.log('2. Clear browser cache');
console.log('3. Test the dashboard');
console.log('');
console.log('If issues persist, the problem might be:');
console.log('• Server caching');
console.log('• Browser caching');
console.log('• Another middleware overriding CSP');
console.log('• Docker/environment configuration');

// Create a verification script
const verificationScript = `
// Quick CSP verification
const { securityHeaders } = require('./web/middleware/security');
const express = require('express');
const app = express();

app.use(securityHeaders());

app.get('/verify', (req, res) => {
  const csp = res.getHeader('Content-Security-Policy');
  console.log('Current CSP:', csp);
  
  const checks = {
    'script-src-attr': csp.includes('script-src-attr'),
    'style-src-elem': csp.includes('style-src-elem'),
    'script-src-elem': csp.includes('script-src-elem'),
    'cdn.jsdelivr.net': csp.includes('cdn.jsdelivr.net'),
    'cdn.socket.io': csp.includes('cdn.socket.io'),
    'unsafe-inline': csp.includes("'unsafe-inline'")
  };
  
  res.json({ csp, checks });
});

app.listen(3003, () => {
  console.log('CSP verification server: http://localhost:3003/verify');
});
`;

fs.writeFileSync('verify-csp.js', verificationScript);
console.log('📝 Created verify-csp.js for testing');
console.log('   Run: node verify-csp.js');
console.log('   Visit: http://localhost:3003/verify');