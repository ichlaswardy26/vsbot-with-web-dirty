const fs = require('fs');

try {
  // Read the file
  let content = fs.readFileSync('commands/voice/voice.js', 'utf8');
  
  // Count occurrences before replacement
  const beforeCount = (content.match(/for \(const \[memberId, member\] of voiceChannel\.members\)/g) || []).length;
  console.log(`Found ${beforeCount} instances to replace`);
  
  // Do the replacement
  content = content.replace(/for \(const \[memberId, member\] of voiceChannel\.members\)/g, 'for (const [memberId] of voiceChannel.members)');
  
  // Count after replacement
  const afterCount = (content.match(/for \(const \[memberId, member\] of voiceChannel\.members\)/g) || []).length;
  console.log(`Remaining instances: ${afterCount}`);
  
  // Write back
  fs.writeFileSync('commands/voice/voice.js', content);
  console.log('Successfully fixed voice.js');
  
} catch (error) {
  console.error('Error:', error.message);
}