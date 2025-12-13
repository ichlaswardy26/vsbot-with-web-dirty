const fs = require('fs');

// Fix voice.js
let voiceContent = fs.readFileSync('commands/voice/voice.js', 'utf8');
voiceContent = voiceContent.replace(/for \(const \[memberId, member\] of voiceChannel\.members\)/g, 'for (const [memberId] of voiceChannel.members)');
fs.writeFileSync('commands/voice/voice.js', voiceContent);

// Fix other unused variables by commenting them out
const fixes = [
  {
    file: 'handlers/buttons/wordChainHandler.js',
    search: 'const playerCount = game.players.length;',
    replace: '// const playerCount = game.players.length;'
  },
  {
    file: 'handlers/buttons/wordChainHandler.js', 
    search: 'let lobbyPlayerList = "";',
    replace: '// let lobbyPlayerList = "";'
  },
  {
    file: 'handlers/buttons/wordChainHandler.js',
    search: 'const result = wordChainManager.rollWord(',
    replace: '// const result = wordChainManager.rollWord('
  }
];

fixes.forEach(fix => {
  try {
    let content = fs.readFileSync(fix.file, 'utf8');
    content = content.replace(new RegExp(fix.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.replace);
    fs.writeFileSync(fix.file, content);
    console.log(`Fixed ${fix.file}`);
  } catch (error) {
    console.log(`Could not fix ${fix.file}: ${error.message}`);
  }
});

console.log('Manual fixes applied');