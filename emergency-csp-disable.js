#!/usr/bin/env node

/**
 * EMERGENCY CSP DISABLE
 * This will temporarily disable CSP so you can access your dashboard
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY: Disabling CSP to unblock dashboard access');
console.log('=====================================================');

const securityFile = 'web/middleware/security.js';

if (!fs.existsSync(securityFile)) {
  console.error('❌ Security middleware file not found');
  process.exit(1);
}

// Create backup
const backupFile = securityFile + '.backup-' + Date.now();
fs.copyFileSync(securityFile, backupFile);
console.log(`📦 Backup created: ${backupFile}`);

// Read current content
let content = fs.readFileSync(securityFile, 'utf8');

// Replace CSP configuration with disabled CSP
const disabledCSP = `/**
 * EMERGENCY: CSP DISABLED - Security headers middleware
 */
function securityHeaders() {
  console.log('[Security] CSP TEMPORARILY DISABLED - Dashboard should work now');
  
  return helmet({
    contentSecurityPolicy: false, // DISABLED FOR EMERGENCY ACCESS
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true
  });`;

// Find and replace the securityHeaders function
const functionRegex = /\/\*\*[\s\S]*?\*\/\s*function securityHeaders\(\)\s*\{[\s\S]*?return helmet\(\{[\s\S]*?\}\);/;

if (functionRegex.test(content)) {
  content = content.replace(functionRegex, disabledCSP);
  console.log('✅ CSP has been DISABLED');
} else {
  console.log('❌ Could not find securityHeaders function to disable');
  process.exit(1);
}

// Write the updated content
fs.writeFileSync(securityFile, content, 'utf8');

console.log('');
console.log('🔄 Now rebuild your Docker container:');
console.log('=====================================');
console.log('docker-compose down');
console.log('docker-compose build --no-cache');
console.log('docker-compose up -d');
console.log('');
console.log('🌐 After rebuild, your dashboard should work without CSP errors');
console.log('');
console.log('⚠️  IMPORTANT SECURITY WARNING:');
console.log('CSP is now DISABLED - your site is less secure');
console.log('This is a temporary fix to get you unstuck');
console.log('');
console.log('🔒 To re-enable CSP later:');
console.log(`cp ${backupFile} ${securityFile}`);
console.log('Then rebuild Docker container again');

// Create a re-enable script
const reEnableScript = `#!/usr/bin/env node

const fs = require('fs');

console.log('🔒 Re-enabling CSP security...');

const backupFile = '${backupFile}';
const securityFile = '${securityFile}';

if (fs.existsSync(backupFile)) {
  fs.copyFileSync(backupFile, securityFile);
  console.log('✅ CSP security restored from backup');
  console.log('🔄 Rebuild Docker container to apply:');
  console.log('   docker-compose down');
  console.log('   docker-compose build --no-cache');
  console.log('   docker-compose up -d');
} else {
  console.log('❌ Backup file not found');
}
`;

fs.writeFileSync('re-enable-csp.js', reEnableScript);
console.log(`📝 Created re-enable-csp.js to restore security later`);

console.log('');
console.log('✨ Emergency CSP disable complete!');
console.log('Rebuild your Docker container now.');