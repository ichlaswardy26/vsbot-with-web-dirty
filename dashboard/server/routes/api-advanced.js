const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { logger } = require('../middleware/logger');
const AuditLog = require('../models/AuditLog');

// Import schemas
const User = require('../../../schemas/UserBalance');
const Level = require('../../../schemas/Leveling');
const VoiceTime = require('../../../schemas/VoiceActivity');
const Giveaway = require('../../../schemas/Giveaway');

// ==================== ADVANCED ANALYTICS ====================

// Get detailed statistics
router.get('/analytics/detailed', ensureAuthenticated, async (req, res) => {
  try {
    const timeout = 5000;
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const [
      totalUsers,
      totalLevels,
      totalCash,
      avgCash,
      avgLevel,
      topUsers,
      topLevels,
      recentActivity
    ] = await Promise.all([
      db.collection('economies').countDocuments({}, { maxTimeMS: timeout }).catch(() => 0),
      db.collection('levelings').countDocuments({}, { maxTimeMS: timeout }).catch(() => 0),
      db.collection('economies').aggregate([{ $group: { _id: null, total: { $sum: '$cash' } } }], { maxTimeMS: timeout }).toArray().catch(() => []),
      db.collection('economies').aggregate([{ $group: { _id: null, avg: { $avg: '$cash' } } }], { maxTimeMS: timeout }).toArray().catch(() => []),
      db.collection('levelings').aggregate([{ $group: { _id: null, avg: { $avg: '$level' } } }], { maxTimeMS: timeout }).toArray().catch(() => []),
      db.collection('economies').find({}).sort({ cash: -1 }).limit(5).maxTimeMS(timeout).toArray().catch(() => []),
      db.collection('levelings').find({}).sort({ level: -1 }).limit(5).maxTimeMS(timeout).toArray().catch(() => []),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).maxTimeMS(timeout).catch(() => [])
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          avgCash: Math.round(avgCash[0]?.avg || 0)
        },
        levels: {
          total: totalLevels,
          avgLevel: Math.round(avgLevel[0]?.avg || 0)
        },
        economy: {
          totalCash: totalCash[0]?.total || 0,
          avgCash: Math.round(avgCash[0]?.avg || 0)
        },
        leaderboards: {
          topUsers,
          topLevels
        },
        recentActivity
      }
    });
  } catch (error) {
    logger.error('Detailed analytics error:', { error: error.message });
    res.json({
      success: true,
      data: {
        users: { total: 0, avgCash: 0 },
        levels: { total: 0, avgLevel: 0 },
        economy: { totalCash: 0, avgCash: 0 },
        leaderboards: { topUsers: [], topLevels: [] },
        recentActivity: []
      }
    });
  }
});

// Get user growth data (for charts)
router.get('/analytics/growth', ensureAuthenticated, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const growth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data: growth });
  } catch (error) {
    logger.error('Growth analytics error:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get level distribution
router.get('/analytics/level-distribution', ensureAuthenticated, async (req, res) => {
  try {
    const distribution = await Level.aggregate([
      {
        $bucket: {
          groupBy: '$level',
          boundaries: [1, 11, 21, 31, 41, 51, 61, 71, 81, 91, 101],
          default: '100+',
          output: {
            count: { $sum: 1 },
            avgXp: { $avg: '$xp' }
          }
        }
      }
    ]);

    res.json({ success: true, data: distribution });
  } catch (error) {
    logger.error('Level distribution error:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BULK OPERATIONS ====================

// Bulk update users
router.post('/bulk/users/update', ensureAuthenticated, async (req, res) => {
  try {
    const { userIds, operation, value } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid user IDs' });
    }
    
    if (userIds.length > 100) {
      return res.status(400).json({ success: false, error: 'Maximum 100 users per bulk operation' });
    }
    
    let updateQuery = {};
    
    switch (operation) {
      case 'add':
        updateQuery = { $inc: { cash: parseInt(value) } };
        break;
      case 'set':
        updateQuery = { $set: { cash: parseInt(value) } };
        break;
      case 'multiply':
        // This requires fetching and updating individually
        const users = await User.find({ userId: { $in: userIds } });
        await Promise.all(users.map(user => 
          User.updateOne(
            { userId: user.userId },
            { $set: { cash: user.cash * parseFloat(value) } }
          )
        ));
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid operation' });
    }
    
    if (operation !== 'multiply') {
      await User.updateMany(
        { userId: { $in: userIds } },
        updateQuery
      );
    }
    
    // Log audit
    await AuditLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: 'BULK_OPERATION',
      targetType: 'USER',
      changes: { operation, value, userCount: userIds.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    logger.info('Bulk user update', {
      admin: req.user.username,
      operation,
      userCount: userIds.length
    });
    
    res.json({ success: true, message: `Updated ${userIds.length} users` });
  } catch (error) {
    logger.error('Bulk update error:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DATA EXPORT ====================

// Export users to JSON
router.get('/export/users', ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.find().lean().maxTimeMS(10000);
    
    // Log audit
    await AuditLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: 'DATA_EXPORT',
      targetType: 'USER',
      changes: { recordCount: users.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    logger.info('Data export', {
      admin: req.user.username,
      type: 'users',
      count: users.length
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=users-${Date.now()}.json`);
    res.json(users);
  } catch (error) {
    logger.error('Export error:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export levels to JSON
router.get('/export/levels', ensureAuthenticated, async (req, res) => {
  try {
    const levels = await Level.find().lean().maxTimeMS(10000);
    
    await AuditLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: 'DATA_EXPORT',
      targetType: 'LEVEL',
      changes: { recordCount: levels.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=levels-${Date.now()}.json`);
    res.json(levels);
  } catch (error) {
    logger.error('Export error:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUDIT LOGS ====================

// Get audit logs
router.get('/audit-logs', ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const { action, adminId, startDate, endDate } = req.query;
    
    let query = {};
    if (action) query.action = action;
    if (adminId) query.adminId = adminId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(5000)
        .catch(() => []),
      AuditLog.countDocuments(query)
        .maxTimeMS(5000)
        .catch(() => 0)
    ]);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Audit logs error:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SYSTEM INFO ====================

// Get system information
router.get('/system/info', ensureAuthenticated, async (req, res) => {
  try {
    const os = require('os');
    
    const info = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
      uptime: Math.round(os.uptime() / 60 / 60) + ' hours',
      nodeVersion: process.version,
      dashboardUptime: Math.round(process.uptime() / 60) + ' minutes'
    };
    
    res.json({ success: true, data: info });
  } catch (error) {
    logger.error('System info error:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get database statistics
router.get('/system/database', ensureAuthenticated, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const stats = await db.stats();
    
    const info = {
      collections: stats.collections,
      dataSize: Math.round(stats.dataSize / 1024 / 1024) + ' MB',
      storageSize: Math.round(stats.storageSize / 1024 / 1024) + ' MB',
      indexes: stats.indexes,
      indexSize: Math.round(stats.indexSize / 1024 / 1024) + ' MB',
      objects: stats.objects
    };
    
    res.json({ success: true, data: info });
  } catch (error) {
    logger.error('Database stats error:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
