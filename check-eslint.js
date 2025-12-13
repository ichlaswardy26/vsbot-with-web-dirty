const { execSync } = require('child_process');

try {
  const result = execSync('node node_modules/eslint/bin/eslint.js . --format=compact', { encoding: 'utf8' });
  console.log('ESLint output:');
  console.log(result);
} catch (error) {
  console.log('ESLint found errors:');
  console.log(error.stdout);
  
  // Count errors
  const lines = error.stdout.split('\n').filter(line => line.includes('error'));
  console.log(`\nTotal error lines: ${lines.length}`);
}