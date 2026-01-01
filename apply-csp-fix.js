#!/usr/bin/env node

/**
 * Apply CSP Fix - Replace security middleware with fixed version
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying CSP fix by replacing security middleware...');

const originalFile = 'web/middleware/security.js';
const fixedFile = 'web/middleware/security-fixed.js';
const backupFile = 'web/middleware/security.js.backup';

// Check if files exist
if (!fs.existsSync(originalFile)) {
  console.error('❌ Original security middleware not found');
  process.exit(1);
}

if (!fs.existsSync(fixedFile)) {
  console.error('❌ Fixed security middleware not found');
  process.exit(1);
}

try {
  // Create backup of original file
  console.log('📦 Creating backup of original security middleware...');
  fs.copyFileSync(originalFile, backupFile);
  console.log(`✅ Backup created: ${backupFile}`);

  // Replace original with fixed version
  console.log('🔄 Replacing security middleware with fixed version...');
  fs.copyFileSync(fixedFile, originalFile);
  console.log('✅ Security middleware replaced successfully');

  // Verify the replacement
  const newContent = fs.readFileSync(originalFile, 'utf8');
  
  const checks = [
    { name: 'scriptSrcAttr directive', pattern: /scriptSrcAttr:\s*\[.*"'unsafe-inline'".*\]/ },
    { name: 'styleSrcElem directive', pattern: /styleSrcElem:\s*\[/ },
    { name: 'scriptSrcElem directive', pattern: /scriptSrcElem:\s*\[/ },
    { name: 'cdn.jsdelivr.net allowed', pattern: /https:\/\/cdn\.jsdelivr\.net/ },
    { name: 'cdn.socket.io allowed', pattern: /https:\/\/cdn\.socket\.io/ },
    { name: 'cdnjs.cloudflare.com allowed', pattern: /https:\/\/cdnjs\.cloudflare\.com/ }
  ];

  console.log('\n🔍 Verifying CSP configuration:');
  let allChecksPass = true;
  
  checks.forEach(check => {
    if (check.pattern.test(newContent)) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name}`);
      allChecksPass = false;
    }
  });

  if (allChecksPass) {
    console.log('\n🎉 All CSP checks passed!');
  } else {
    console.log('\n⚠️  Some CSP checks failed');
  }

  console.log('\n📋 Next Steps:');
  console.log('==============');
  console.log('1. 🔄 Restart your server');
  console.log('   - Stop current server (Ctrl+C)');
  console.log('   - Run: npm start or node start.js');
  console.log('');
  console.log('2. 🧹 Clear browser cache');
  console.log('   - Chrome: Ctrl+Shift+R');
  console.log('   - Firefox: Ctrl+F5');
  console.log('   - Or use DevTools → Network → Disable cache');
  console.log('');
  console.log('3. 🧪 Test the dashboard');
  console.log('   - Visit your dashboard');
  console.log('   - Check browser console for CSP errors');
  console.log('   - Verify external resources load');
  console.log('');
  console.log('4. 🔙 Rollback if needed');
  console.log(`   - Restore backup: cp ${backupFile} ${originalFile}`);

  // Create a quick test script
  const testScript = `
const { securityHeaders } = require('./web/middleware/security');
const express = require('express');
const app = express();

app.use(securityHeaders());

app.get('/test', (req, res) => {
  const csp = res.getHeader('Content-Security-Policy');
  console.log('\\n🔍 Current CSP Header:');
  console.log(csp);
  
  const requiredParts = [
    'script-src-attr',
    'style-src-elem', 
    'script-src-elem',
    'cdn.jsdelivr.net',
    'cdn.socket.io'
  ];
  
  console.log('\\n✅ CSP Validation:');
  requiredParts.forEach(part => {
    const found = csp.includes(part);
    console.log(\`\${found ? '✅' : '❌'} \${part}\`);
  });
  
  res.json({ 
    success: true, 
    csp: csp,
    timestamp: new Date().toISOString()
  });
});

const port = 3004;
app.listen(port, () => {
  console.log(\`\\n🌐 CSP test server: http://localhost:\${port}/test\`);
  console.log('Visit the URL above to verify CSP configuration');
});
`;

  fs.writeFileSync('quick-csp-test.js', testScript);
  console.log('\n📝 Created quick-csp-test.js for verification');
  console.log('   Run: node quick-csp-test.js');

} catch (error) {
  console.error('❌ Error applying CSP fix:', error.message);
  
  // Try to restore backup if replacement failed
  if (fs.existsSync(backupFile)) {
    try {
      fs.copyFileSync(backupFile, originalFile);
      console.log('🔙 Restored original file from backup');
    } catch (restoreError) {
      console.error('❌ Failed to restore backup:', restoreError.message);
    }
  }
  
  process.exit(1);
}

console.log('\n✨ CSP fix applied successfully!');
console.log('Remember to restart your server for changes to take effect.');