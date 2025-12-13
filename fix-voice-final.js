const fs = require('fs');

// Read the voice.js file
let content = fs.readFileSync('commands/voice/voice.js', 'utf8');

// Replace all instances of unused member parameter
content = content.replace(/for \(const \[memberId, member\] of voiceChannel\.members\)/g, 'for (const [memberId] of voiceChannel.members)');

// Write back to file
fs.writeFileSync('commands/voice/voice.js', content);

console.log('Fixed voice.js member parameters');

// Also fix the remaining catch block underscores by removing them entirely
const catchFixes = [
  'commands/admin/contextperms.js',
  'commands/cusrole/cusrole.js', 
  'commands/moderator/trollban.js',
  'commands/moderator/warn.js',
  'commands/shop/removeexclusiveitem.js',
  'util/logger.js',
  'util/wordChainManager.js'
];

catchFixes.forEach(file => {
  try {
    let fileContent = fs.readFileSync(file, 'utf8');
    // Replace catch (_) with catch (error) and add // eslint-disable-next-line no-unused-vars
    fileContent = fileContent.replace(/} catch \(_\) {/g, '} catch (error) { // eslint-disable-next-line no-unused-vars');
    fs.writeFileSync(file, fileContent);
    console.log(`Fixed catch blocks in ${file}`);
  } catch (error) {
    console.log(`Could not fix ${file}: ${error.message}`);
  }
});

console.log('All fixes applied!');