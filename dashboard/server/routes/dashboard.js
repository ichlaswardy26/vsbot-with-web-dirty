const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Import schemas (from root project folder)
const User = require('../../../schemas/UserBalance');
const Level = require('../../../schemas/Leveling');
const VoiceTime = require('../../../schemas/VoiceActivity');
const Giveaway = require('../../../schemas/Giveaway');

// Dashboard home
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const timeout = 5000; // 5 seconds
    const mongoose = require('mongoose');
    
    // Use native MongoDB operations for better performance
    const db = mongoose.connection.db;
    
    const [totalUsers, totalLevels, activeGiveaways, topUsers, topLevels] = await Promise.all([
      // Use native count operations
      db.collection('economies').countDocuments({}, { maxTimeMS: timeout }).catch(() => 0),
      db.collection('levelings').countDocuments({}, { maxTimeMS: timeout }).catch(() => 0),
      db.collection('giveaways').countDocuments({ ended: false }, { maxTimeMS: timeout }).catch(() => 0),
      
      // Use native find operations
      db.collection('economies').find({}).sort({ cash: -1 }).limit(10).maxTimeMS(timeout).toArray().catch(() => []),
      db.collection('levelings').find({}).sort({ level: -1 }).limit(10).maxTimeMS(timeout).toArray().catch(() => [])
    ]);

    res.render('dashboard/index', {
      title: 'Dashboard',
      stats: {
        totalUsers,
        totalLevels,
        activeGiveaways
      },
      topUsers,
      topLevels
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    
    // Fallback with default values
    res.render('dashboard/index', {
      title: 'Dashboard',
      stats: {
        totalUsers: 0,
        totalLevels: 0,
        activeGiveaways: 0
      },
      topUsers: [],
      topLevels: []
    });
  }
});

// Users management
router.get('/users', ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const timeout = 5000;
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    const [totalUsers, users] = await Promise.all([
      db.collection('economies').countDocuments({}, { maxTimeMS: timeout }).catch(() => 0),
      db.collection('economies').find({})
        .sort({ cash: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(timeout)
        .toArray()
        .catch(() => [])
    ]);

    res.render('dashboard/users', {
      title: 'Users Management',
      users,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit)
    });
  } catch (error) {
    console.error('Users page error:', error);
    
    res.render('dashboard/users', {
      title: 'Users Management',
      users: [],
      currentPage: 1,
      totalPages: 1
    });
  }
});

// Levels management
router.get('/levels', ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const timeout = 5000;
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    const [totalLevels, levels] = await Promise.all([
      db.collection('levelings').countDocuments({}, { maxTimeMS: timeout }).catch(() => 0),
      db.collection('levelings').find({})
        .sort({ level: -1, xp: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(timeout)
        .toArray()
        .catch(() => [])
    ]);

    res.render('dashboard/levels', {
      title: 'Levels Management',
      levels,
      currentPage: page,
      totalPages: Math.ceil(totalLevels / limit)
    });
  } catch (error) {
    console.error('Levels page error:', error);
    
    res.render('dashboard/levels', {
      title: 'Levels Management',
      levels: [],
      currentPage: 1,
      totalPages: 1
    });
  }
});

// Configuration management
router.get('/config', ensureAuthenticated, (req, res) => {
  try {
    const envPath = path.join(__dirname, '../../../.env');
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    
    // Parse .env file
    const config = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    res.render('dashboard/config', {
      title: 'Configuration',
      config
    });
  } catch (error) {
    console.error('Config page error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      error: { message: 'Failed to load configuration' }
    });
  }
});

// Bot control
router.get('/control', ensureAuthenticated, (req, res) => {
  res.render('dashboard/control', {
    title: 'Bot Control'
  });
});

// Analytics
router.get('/analytics', ensureAuthenticated, async (req, res) => {
  try {
    const timeout = 5000;
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const [totalUsers, totalSouls, avgLevel] = await Promise.all([
      db.collection('economies').countDocuments({}, { maxTimeMS: timeout }).catch(() => 0),
      db.collection('economies').aggregate([
        { $group: { _id: null, total: { $sum: '$cash' } } }
      ], { maxTimeMS: timeout }).toArray().catch(() => []),
      db.collection('levelings').aggregate([
        { $group: { _id: null, avg: { $avg: '$level' } } }
      ], { maxTimeMS: timeout }).toArray().catch(() => [])
    ]);

    res.render('dashboard/analytics', {
      title: 'Analytics',
      stats: {
        totalUsers,
        totalSouls: totalSouls[0]?.total || 0,
        avgLevel: Math.round(avgLevel[0]?.avg || 0)
      }
    });
  } catch (error) {
    console.error('Analytics page error:', error);
    
    res.render('dashboard/analytics', {
      title: 'Analytics',
      stats: {
        totalUsers: 0,
        totalSouls: 0,
        avgLevel: 0
      }
    });
  }
});

// Audit Logs
router.get('/audit-logs', ensureAuthenticated, (req, res) => {
  res.render('dashboard/audit-logs', {
    title: 'Audit Logs'
  });
});

module.exports = router;
