const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { validateUserId, validateUserUpdate, validateLevelUpdate, validateConfig } = require('../middleware/validator');
const { logger } = require('../middleware/logger');
const AuditLog = require('../models/AuditLog');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Import schemas (from root project folder)
const User = require('../../../schemas/UserBalance');
const Level = require('../../../schemas/Leveling');
const VoiceTime = require('../../../schemas/VoiceActivity');

// Get bot status
router.get('/bot/status', ensureAuthenticated, (req, res) => {
  exec('tasklist', (error, stdout) => {
    const isRunning = stdout.toLowerCase().includes('node.exe');
    res.json({ 
      running: isRunning,
      uptime: process.uptime()
    });
  });
});

// Update user
router.post('/users/:userId', ensureAuthenticated, validateUserId, validateUserUpdate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { cash } = req.body;

    // Get old values for audit
    const oldUser = await User.findOne({ userId });
    
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: { cash: parseInt(cash) } },
      { new: true, upsert: true }
    );

    // Log audit
    await AuditLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: 'USER_UPDATE',
      targetType: 'USER',
      targetId: userId,
      oldValues: { cash: oldUser?.cash || 0 },
      newValues: { cash: parseInt(cash) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info('User updated', {
      admin: req.user.username,
      userId,
      oldCash: oldUser?.cash || 0,
      newCash: parseInt(cash)
    });

    res.json({ success: true, user });
  } catch (error) {
    logger.error('Update user error:', { error: error.message, userId: req.params.userId });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update level
router.post('/levels/:userId', ensureAuthenticated, validateUserId, validateLevelUpdate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { level, xp } = req.body;

    // Get old values for audit
    const oldLevel = await Level.findOne({ userId });

    const levelData = await Level.findOneAndUpdate(
      { userId },
      { $set: { level: parseInt(level), xp: parseInt(xp) } },
      { new: true, upsert: true }
    );

    // Log audit
    await AuditLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: 'LEVEL_UPDATE',
      targetType: 'LEVEL',
      targetId: userId,
      oldValues: { level: oldLevel?.level || 1, xp: oldLevel?.xp || 0 },
      newValues: { level: parseInt(level), xp: parseInt(xp) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info('Level updated', {
      admin: req.user.username,
      userId,
      oldLevel: oldLevel?.level || 1,
      newLevel: parseInt(level)
    });

    res.json({ success: true, level: levelData });
  } catch (error) {
    logger.error('Update level error:', { error: error.message, userId: req.params.userId });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete user
router.delete('/users/:userId', ensureAuthenticated, validateUserId, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get data before deletion for audit
    const [user, level, voiceTime] = await Promise.all([
      User.findOne({ userId }),
      Level.findOne({ userId }),
      VoiceTime.findOne({ userId })
    ]);
    
    await Promise.all([
      User.deleteOne({ userId }),
      Level.deleteOne({ userId }),
      VoiceTime.deleteOne({ userId })
    ]);

    // Log audit
    await AuditLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: 'USER_DELETE',
      targetType: 'USER',
      targetId: userId,
      oldValues: {
        cash: user?.cash || 0,
        level: level?.level || 0,
        xp: level?.xp || 0
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.warn('User deleted', {
      admin: req.user.username,
      userId,
      hadData: { user: !!user, level: !!level, voiceTime: !!voiceTime }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete user error:', { error: error.message, userId: req.params.userId });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update configuration
router.post('/config', ensureAuthenticated, validateConfig, async (req, res) => {
  try {
    const { config } = req.body;
    const envPath = path.join(__dirname, '../../../.env');
    
    // Read old config for audit
    const oldConfig = {};
    if (fs.existsSync(envPath)) {
      const oldContent = fs.readFileSync(envPath, 'utf8');
      oldContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key) oldConfig[key.trim()] = valueParts.join('=').trim();
        }
      });
    }
    
    // Build .env content
    let envContent = '';
    for (const [key, value] of Object.entries(config)) {
      envContent += `${key}=${value}\n`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    
    // Log audit (without sensitive data)
    const changedKeys = Object.keys(config).filter(key => oldConfig[key] !== config[key]);
    await AuditLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: 'CONFIG_UPDATE',
      targetType: 'CONFIG',
      changes: { changedKeys },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.warn('Configuration updated', {
      admin: req.user.username,
      changedKeys
    });
    
    res.json({ success: true, message: 'Configuration updated. Please restart the bot for changes to take effect.' });
  } catch (error) {
    logger.error('Update config error:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistics
router.get('/stats', ensureAuthenticated, async (req, res) => {
  try {
    const timeout = 5000;
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const [totalUsers, totalLevels, totalCash] = await Promise.all([
      db.collection('economies').countDocuments({}, { maxTimeMS: timeout }).catch(() => 0),
      db.collection('levelings').countDocuments({}, { maxTimeMS: timeout }).catch(() => 0),
      db.collection('economies').aggregate([
        { $group: { _id: null, total: { $sum: '$cash' } } }
      ], { maxTimeMS: timeout }).toArray().catch(() => [])
    ]);

    res.json({
      totalUsers,
      totalLevels,
      totalSouls: totalCash[0]?.total || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.json({
      totalUsers: 0,
      totalLevels: 0,
      totalSouls: 0
    });
  }
});

// Search users
router.get('/users/search', ensureAuthenticated, async (req, res) => {
  try {
    const { q } = req.query;
    const users = await User.find({
      userId: { $regex: q, $options: 'i' }
    }).limit(10).maxTimeMS(5000);

    res.json({ success: true, users });
  } catch (error) {
    console.error('Search error:', error);
    res.json({ success: true, users: [] });
  }
});

module.exports = router;
