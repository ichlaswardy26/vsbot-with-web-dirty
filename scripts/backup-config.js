#!/usr/bin/env node

// Script untuk backup dan restore konfigurasi
// Usage: 
//   node scripts/backup-config.js backup
//   node scripts/backup-config.js restore <backup-file>

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Define BotConfig schema
const botConfigSchema = new mongoose.Schema({
  channels: { type: Object, default: {} },
  roles: { type: Object, default: {} },
  categories: { type: Object, default: {} },
  emojis: { type: Object, default: {} },
  images: { type: Object, default: {} },
  features: { type: Object, default: {} },
  colors: { type: Object, default: {} },
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: String, default: null },
  version: { type: Number, default: 1 }
}, { timestamps: true });

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  console.log('✅ Connected to MongoDB');
}

async function backupConfig() {
  try {
    console.log('📦 Creating configuration backup...');
    
    await connectDB();
    const BotConfig = mongoose.model('BotConfig', botConfigSchema);
    
    const config = await BotConfig.findOne().lean();
    
    if (!config) {
      console.log('⚠️ No configuration found in database');
      return;
    }

    // Create backup directory if it doesn't exist
    const backupDir = path.resolve(__dirname, '../backups');
    await fs.mkdir(backupDir, { recursive: true });

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `config-backup-${timestamp}.json`);

    // Prepare backup data
    const backupData = {
      metadata: {
        backupDate: new Date().toISOString(),
        originalVersion: config.version,
        originalUpdatedBy: config.updatedBy,
        originalLastUpdated: config.lastUpdated,
        botVersion: process.env.npm_package_version || 'unknown'
      },
      config: {
        channels: config.channels || {},
        roles: config.roles || {},
        categories: config.categories || {},
        emojis: config.emojis || {},
        images: config.images || {},
        features: config.features || {},
        colors: config.colors || {}
      }
    };

    // Write backup file
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2), 'utf8');

    console.log('✅ Backup created successfully!');
    console.log(`📁 File: ${backupFile}`);
    console.log(`📊 Size: ${(await fs.stat(backupFile)).size} bytes`);
    
    // Show summary
    console.log('\n📋 Backup Summary:');
    console.log(`   Version: ${config.version}`);
    console.log(`   Last Updated: ${config.lastUpdated}`);
    console.log(`   Updated By: ${config.updatedBy || 'Unknown'}`);
    console.log(`   Channels: ${Object.keys(config.channels || {}).length}`);
    console.log(`   Roles: ${countNestedKeys(config.roles || {})}`);
    console.log(`   Categories: ${Object.keys(config.categories || {}).length}`);
    console.log(`   Emojis: ${Object.keys(config.emojis || {}).length}`);
    console.log(`   Images: ${Object.keys(config.images || {}).length}`);
    console.log(`   Features: ${Object.keys(config.features || {}).length}`);
    console.log(`   Colors: ${Object.keys(config.colors || {}).length}`);

    return backupFile;
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

async function restoreConfig(backupFile) {
  try {
    console.log(`🔄 Restoring configuration from ${backupFile}...`);
    
    // Check if backup file exists
    try {
      await fs.access(backupFile);
    } catch {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    // Read backup file
    const backupContent = await fs.readFile(backupFile, 'utf8');
    const backupData = JSON.parse(backupContent);

    if (!backupData.config) {
      throw new Error('Invalid backup file format: missing config section');
    }

    await connectDB();
    const BotConfig = mongoose.model('BotConfig', botConfigSchema);

    // Get current config for comparison
    const currentConfig = await BotConfig.findOne();
    
    if (currentConfig) {
      console.log('⚠️ Current configuration will be overwritten');
      console.log(`   Current Version: ${currentConfig.version}`);
      console.log(`   Backup Version: ${backupData.metadata.originalVersion}`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('Continue with restore? (y/N): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ Restore cancelled');
        return;
      }
    }

    // Prepare restore data
    const restoreData = {
      ...backupData.config,
      updatedBy: 'restore-script',
      version: currentConfig ? currentConfig.version + 1 : 1,
      lastUpdated: new Date()
    };

    // Restore to database
    if (currentConfig) {
      Object.assign(currentConfig, restoreData);
      await currentConfig.save();
    } else {
      await BotConfig.create(restoreData);
    }

    console.log('✅ Configuration restored successfully!');
    
    // Show restore summary
    console.log('\n📋 Restore Summary:');
    console.log(`   Backup Date: ${backupData.metadata.backupDate}`);
    console.log(`   Original Version: ${backupData.metadata.originalVersion}`);
    console.log(`   New Version: ${restoreData.version}`);
    console.log(`   Channels: ${Object.keys(restoreData.channels || {}).length}`);
    console.log(`   Roles: ${countNestedKeys(restoreData.roles || {})}`);
    console.log(`   Categories: ${Object.keys(restoreData.categories || {}).length}`);
    console.log(`   Emojis: ${Object.keys(restoreData.emojis || {}).length}`);
    console.log(`   Images: ${Object.keys(restoreData.images || {}).length}`);
    console.log(`   Features: ${Object.keys(restoreData.features || {}).length}`);
    console.log(`   Colors: ${Object.keys(restoreData.colors || {}).length}`);

  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    throw error;
  }
}

async function listBackups() {
  try {
    const backupDir = path.resolve(__dirname, '../backups');
    
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => file.startsWith('config-backup-') && file.endsWith('.json'));
      
      if (backupFiles.length === 0) {
        console.log('📁 No backup files found');
        return;
      }

      console.log('📋 Available Backups:');
      
      for (const file of backupFiles.sort().reverse()) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          
          console.log(`\n📦 ${file}`);
          console.log(`   Date: ${data.metadata.backupDate}`);
          console.log(`   Size: ${stats.size} bytes`);
          console.log(`   Version: ${data.metadata.originalVersion}`);
          console.log(`   Updated By: ${data.metadata.originalUpdatedBy || 'Unknown'}`);
        } catch {
          console.log(`\n📦 ${file} (corrupted or invalid format)`);
          console.log(`   Date: ${stats.mtime.toISOString()}`);
          console.log(`   Size: ${stats.size} bytes`);
        }
      }
      
    } catch {
      console.log('📁 Backup directory not found');
    }
    
  } catch (error) {
    console.error('❌ Failed to list backups:', error.message);
  }
}

// Helper function to count nested keys
function countNestedKeys(obj) {
  let count = 0;
  
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      count += countNestedKeys(value);
    } else if (value !== null && value !== undefined) {
      count++;
    }
  }
  
  return count;
}

// Main function
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'backup':
        await backupConfig();
        break;
        
      case 'restore':
        if (!arg) {
          console.error('❌ Please specify backup file to restore');
          console.log('Usage: node scripts/backup-config.js restore <backup-file>');
          process.exit(1);
        }
        await restoreConfig(arg);
        break;
        
      case 'list':
        await listBackups();
        break;
        
      default:
        console.log('🔧 Configuration Backup & Restore Tool');
        console.log('\nUsage:');
        console.log('  node scripts/backup-config.js backup          - Create backup');
        console.log('  node scripts/backup-config.js restore <file>  - Restore from backup');
        console.log('  node scripts/backup-config.js list            - List available backups');
        break;
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⏹️ Operation interrupted');
  await mongoose.disconnect();
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { backupConfig, restoreConfig, listBackups };