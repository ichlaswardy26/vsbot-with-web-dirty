const fs = require('fs');

// Fix the unused member parameter in voice.js
let content = fs.readFileSync('commands/voice/voice.js', 'utf8');

// Replace all instances of the unused member parameter
content = content.replace(/for \(const \[memberId, member\] of voiceChannel\.members\)/g, 'for (const [memberId] of voiceChannel.members)');

fs.writeFileSync('commands/voice/voice.js', content);
console.log('Fixed voice.js member parameters');

// Also fix other unused variables
const filesToFix = [
  { file: 'util/analytics.js', pattern: /const _commandName = ([^;]+);/g, replacement: '// const _commandName = $1;' },
  { file: 'util/contextPermissions.js', pattern: /async function.*\(_guildId\)/g, replacement: match => match.replace('_guildId', '') },
  { file: 'util/performanceMonitor.js', pattern: /const _commandName = ([^;]+);/g, replacement: '// const _commandName = $1;' },
  { file: 'util/roleUtils.js', pattern: /const _roleId = ([^;]+);/g, replacement: '// const _roleId = $1;' },
  { file: 'util/temporaryPermissions.js', pattern: /const _userId = ([^;]+);/g, replacement: '// const _userId = $1;' }
];

filesToFix.forEach(({ file, pattern, replacement }) => {
  try {
    let fileContent = fs.readFileSync(file, 'utf8');
    fileContent = fileContent.replace(pattern, replacement);
    fs.writeFileSync(file, fileContent);
    console.log(`Fixed ${file}`);
  } catch (error) {
    console.log(`Could not fix ${file}: ${error.message}`);
  }
});

console.log('All fixes applied');