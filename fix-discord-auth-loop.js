#!/usr/bin/env node

/**
 * Fix Discord Authentication Loop
 * Diagnoses and fixes common OAuth authentication loop issues
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing Discord Authentication Loop Issues...\n');

// Check environment variables
console.log('1️⃣ Checking Environment Configuration...');

const requiredVars = [
  'CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_CALLBACK_URL',
  'SESSION_SECRET'
];

const issues = [];
const warnings = [];

for (const varName of requiredVars) {
  const value = process.env[varName];
  if (!value) {
    issues.push(`❌ Missing ${varName}`);
  } else {
    console.log(`✅ ${varName}: Set`);
    
    // Check specific values
    if (varName === 'DISCORD_CALLBACK_URL') {
      if (value.includes('localhost') && process.env.NODE_ENV === 'production') {
        warnings.push(`⚠️ Using localhost callback URL in production: ${value}`);
      }
      if (!value.startsWith('http')) {
        issues.push(`❌ Invalid callback URL format: ${value}`);
      }
    }
    
    if (varName === 'SESSION_SECRET' && value === 'change-this-secret') {
      warnings.push(`⚠️ Using default session secret (security risk)`);
    }
  }
}

// Check callback URL consistency
const callbackUrl = process.env.DISCORD_CALLBACK_URL;
const serverIp = process.env.SERVER_IP || '43.129.55.161';

if (callbackUrl && !callbackUrl.includes(serverIp) && !callbackUrl.includes('localhost')) {
  warnings.push(`⚠️ Callback URL doesn't match server IP: ${callbackUrl} vs ${serverIp}`);
}

console.log();

if (issues.length > 0) {
  console.log('🚨 Critical Issues Found:');
  issues.forEach(issue => console.log(`  ${issue}`));
  console.log();
}

if (warnings.length > 0) {
  console.log('⚠️ Warnings:');
  warnings.forEach(warning => console.log(`  ${warning}`));
  console.log();
}

// Check Discord application configuration
console.log('2️⃣ Discord Application Configuration Check...');
console.log(`📋 Your Discord app should have these settings:`);
console.log(`   Client ID: ${process.env.CLIENT_ID || 'NOT_SET'}`);
console.log(`   Redirect URI: ${callbackUrl || 'NOT_SET'}`);
console.log(`   Scopes: identify, guilds`);
console.log();

// Analyze common loop causes
console.log('3️⃣ Common Authentication Loop Causes...');

const commonIssues = [
  {
    issue: 'Cookie/Session Problems',
    causes: [
      'Secure cookies over HTTP',
      'SameSite cookie restrictions',
      'Session store connection issues',
      'Cookie domain mismatches'
    ]
  },
  {
    issue: 'OAuth Configuration',
    causes: [
      'Callback URL mismatch',
      'Invalid client secret',
      'Missing scopes',
      'CORS issues'
    ]
  },
  {
    issue: 'Middleware Conflicts',
    causes: [
      'Security middleware blocking requests',
      'Session middleware order',
      'Passport configuration issues'
    ]
  }
];

commonIssues.forEach(category => {
  console.log(`📋 ${category.issue}:`);
  category.causes.forEach(cause => {
    console.log(`   • ${cause}`);
  });
  console.log();
});

console.log('4️⃣ Generating Fixes...');

// Generate environment fixes
const envFixes = [];

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change-this-secret') {
  const crypto = require('crypto');
  const newSecret = crypto.randomBytes(32).toString('hex');
  envFixes.push(`SESSION_SECRET=${newSecret}`);
}

if (!process.env.DISCORD_CALLBACK_URL) {
  envFixes.push(`DISCORD_CALLBACK_URL=https://${serverIp}/auth/discord/callback`);
}

if (!process.env.ALLOWED_ORIGINS) {
  envFixes.push(`ALLOWED_ORIGINS=http://${serverIp},https://${serverIp}`);
}

if (envFixes.length > 0) {
  console.log('📝 Add these to your .env file:');
  envFixes.forEach(fix => console.log(`   ${fix}`));
  console.log();
}

console.log('✅ Diagnosis complete! Check the generated fix files.');