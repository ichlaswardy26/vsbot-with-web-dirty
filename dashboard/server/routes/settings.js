const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { logger } = require('../middleware/logger');
const DashboardSettings = require('../models/DashboardSettings');
const AuditLog = require('../models/AuditLog');

// Get settings page
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const settings = await DashboardSettings.getSettings();
    
    res.render('dashboard/settings', {
      title: 'Dashboard Settings',
      settings
    });
  } catch (error) {
    logger.error('Settings page error:', { error: error.message });
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Failed to load settings' }
    });
  }
});

// Update settings
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const updates = req.body;
    
    // Get old settings for audit
    const oldSettings = await DashboardSettings.getSettings();
    
    // Update settings
    const newSettings = await DashboardSettings.updateSettings(updates);
    
    // Log audit
    await AuditLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: 'CONFIG_UPDATE',
      targetType: 'SYSTEM',
      targetId: 'dashboard_settings',
      oldValues: oldSettings.toObject(),
      newValues: newSettings.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    logger.info('Dashboard settings updated', {
      admin: req.user.username
    });
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: newSettings
    });
  } catch (error) {
    logger.error('Update settings error:', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get settings API (for frontend)
router.get('/api', ensureAuthenticated, async (req, res) => {
  try {
    const settings = await DashboardSettings.getSettings();
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    logger.error('Get settings API error:', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reset settings to default
router.post('/reset', ensureAuthenticated, async (req, res) => {
  try {
    const oldSettings = await DashboardSettings.getSettings();
    
    // Delete and recreate with defaults
    await DashboardSettings.deleteMany({});
    const newSettings = await DashboardSettings.create({});
    
    // Log audit
    await AuditLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      action: 'CONFIG_UPDATE',
      targetType: 'SYSTEM',
      targetId: 'dashboard_settings',
      changes: { action: 'reset_to_default' },
      oldValues: oldSettings.toObject(),
      newValues: newSettings.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    logger.warn('Dashboard settings reset to default', {
      admin: req.user.username
    });
    
    res.json({
      success: true,
      message: 'Settings reset to default',
      settings: newSettings
    });
  } catch (error) {
    logger.error('Reset settings error:', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
