#!/usr/bin/env node

const fs = require('fs');


// Files with unused _args parameters that should be removed
const filesToFix = [
  'commands/actions/bite.js',
  'commands/actions/cringe.js',
  'commands/actions/cry.js',
  'commands/actions/cuddle.js',
  'commands/actions/dance.js',
  'commands/actions/hug.js',
  'commands/actions/kick.js',
  'commands/actions/kill.js',
  'commands/actions/kiss.js',
  'commands/actions/pat.js',
  'commands/actions/poke.js',
  'commands/actions/slap.js',
  'commands/actions/wave.js',
  'commands/admin/reset.js',
  'commands/admin/resetxp.js',
  'commands/admin/validateconfig.js',
  'commands/confess/reset.js',
  'commands/createembed.js',
  'commands/economy/bal.js',
  'commands/economy/resetsouls.js',
  'commands/level/rank.js',
  'commands/test/say.js',
  'commands/test/testwel.js',
  'commands/ticket/close.js',
  'commands/ticket/ticket.js',
  'commands/voice/claim.js',
  'commands/wordchain.js'
];

function fixUnusedArgs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove _args parameter from function definitions
    content = content.replace(/async exec\(([^,]+),\s*([^,]+),\s*_args\)/g, 'async exec($1, $2)');
    content = content.replace(/exec\(([^,]+),\s*([^,]+),\s*_args\)/g, 'exec($1, $2)');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔧 Fixing unused _args parameters...\n');

let fixedCount = 0;
filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    if (fixUnusedArgs(filePath)) {
      fixedCount++;
    }
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

console.log(`\n✨ Fixed ${fixedCount} files!`);