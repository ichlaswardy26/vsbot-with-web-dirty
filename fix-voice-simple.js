const fs = require('fs');

let content = fs.readFileSync('commands/voice/voice.js', 'utf8');
content = content.replace(/for \(const \[memberId, member\] of voiceChannel\.members\)/g, 'for (const [memberId] of voiceChannel.members)');
fs.writeFileSync('commands/voice/voice.js', content);
console.log('Fixed voice.js');