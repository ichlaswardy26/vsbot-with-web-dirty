#!/usr/bin/env node

// Script untuk migrasi konfigurasi dari file ke database
// Usage: node scripts/migrate-config.js

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Import config file
const configPath = path.resolve(__dirname, '../config.js');
const fileConfig = require(configPath);

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

async function migrateConfig() {
  try {
    console.log('🔄 Starting config migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');

    // Get or create BotConfig model
    const BotConfig = mongoose.model('BotConfig', botConfigSchema);

    // Check if config already exists
    const existingConfig = await BotConfig.findOne();
    
    if (existingConfig) {
      console.log('⚠️ Configuration already exists in database');
      console.log(`   Version: ${existingConfig.version}`);
      console.log(`   Last updated: ${existingConfig.lastUpdated}`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('Do you want to overwrite it? (y/N): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ Migration cancelled');
        process.exit(0);
      }
    }

    // Extract configurable sections from file config
    const configurableConfig = {
      channels: fileConfig.sync?.channels || fileConfig.channels || {},
      roles: fileConfig.sync?.roles || fileConfig.roles || {},
      categories: fileConfig.sync?.categories || fileConfig.categories || {},
      emojis: fileConfig.sync?.emojis || fileConfig.emojis || {},
      images: fileConfig.sync?.images || fileConfig.images || {},
      features: fileConfig.sync?.features || fileConfig.features || {},
      colors: fileConfig.sync?.colors || fileConfig.colors || {},
      updatedBy: 'migration-script',
      version: existingConfig ? existingConfig.version + 1 : 1
    };

    // Clean up null/undefined values
    const cleanConfig = cleanObject(configurableConfig);

    // Save to database
    if (existingConfig) {
      Object.assign(existingConfig, cleanConfig);
      await existingConfig.save();
      console.log('✅ Configuration updated in database');
    } else {
      await BotConfig.create(cleanConfig);
      console.log('✅ Configuration created in database');
    }

    // Display summary
    console.log('\n📊 Migration Summary:');
    console.log(`   Channels: ${Object.keys(cleanConfig.channels).length} configured`);
    console.log(`   Roles: ${countNestedKeys(cleanConfig.roles)} configured`);
    console.log(`   Categories: ${Object.keys(cleanConfig.categories).length} configured`);
    console.log(`   Emojis: ${Object.keys(cleanConfig.emojis).length} configured`);
    console.log(`   Images: ${Object.keys(cleanConfig.images).length} configured`);
    console.log(`   Features: ${Object.keys(cleanConfig.features).length} configured`);
    console.log(`   Colors: ${Object.keys(cleanConfig.colors).length} configured`);

    // Show non-null values
    console.log('\n🔍 Non-null Configuration Values:');
    showNonNullValues(cleanConfig);

    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 You can now configure your bot through the dashboard at http://localhost:8080');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Helper function to clean object from null/undefined values
function cleanObject(obj) {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanObject(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
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

// Helper function to show non-null values
function showNonNullValues(obj, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      showNonNullValues(value, fullKey);
    } else if (value !== null && value !== undefined && value !== '') {
      console.log(`   ${fullKey}: ${value}`);
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⏹️ Migration interrupted');
  await mongoose.disconnect();
  process.exit(0);
});

// Run migration
if (require.main === module) {
  migrateConfig();
}

module.exports = { migrateConfig };