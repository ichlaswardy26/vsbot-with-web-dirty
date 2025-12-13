const fs = require('fs');

// Read voice.js file
let content = fs.readFileSync('commands/voice/voice.js', 'utf8');

// Replace all instances of unused member parameter
content = content.replace(/for \(const \[memberId, member\] of voiceChannel\.members\)/g, 'for (const [memberId] of voiceChannel.members)');

// Write back
fs.writeFileSync('commands/voice/voice.js', content);

console.log('Fixed voice.js member parameters');