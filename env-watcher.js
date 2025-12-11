const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * File watcher untuk .env file
 * Akan restart container ketika .env berubah
 */

const ENV_FILE = path.join(__dirname, '.env');
const CONTAINER_NAME = 'villain-seraphyx-bot';

let isRestarting = false;

function restartContainer() {
    if (isRestarting) {
        console.log('⏳ Restart already in progress...');
        return;
    }

    isRestarting = true;
    console.log('🔄 .env file changed, restarting container...');

    exec(`docker-compose restart ${CONTAINER_NAME}`, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error restarting container:', error);
        } else {
            console.log('✅ Container restarted successfully');
            console.log(stdout);
        }
        
        if (stderr) {
            console.error('⚠️ Stderr:', stderr);
        }
        
        isRestarting = false;
    });
}

function watchEnvFile() {
    if (!fs.existsSync(ENV_FILE)) {
        console.log('⚠️ .env file not found, waiting...');
        setTimeout(watchEnvFile, 5000);
        return;
    }

    console.log('👀 Watching .env file for changes...');
    
    fs.watchFile(ENV_FILE, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            console.log(`📝 .env file modified at ${new Date().toISOString()}`);
            
            // Delay restart untuk memastikan file sudah selesai ditulis
            setTimeout(restartContainer, 2000);
        }
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Stopping env watcher...');
    fs.unwatchFile(ENV_FILE);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Stopping env watcher...');
    fs.unwatchFile(ENV_FILE);
    process.exit(0);
});

// Start watching
console.log('🚀 Starting .env file watcher...');
watchEnvFile();