const DashboardSettings = require('../models/DashboardSettings');

// Middleware to load settings and make them available to all views
const loadSettings = async (req, res, next) => {
  try {
    const settings = await DashboardSettings.getSettings();
    res.locals.dashboardSettings = settings;
    next();
  } catch (error) {
    console.error('Error loading dashboard settings:', error);
    // Continue with default settings
    res.locals.dashboardSettings = {
      title: 'Anna Manager Bot Dashboard',
      subtitle: 'Modern Dashboard untuk Mengontrol Bot Discord',
      brandName: 'Anna Bot',
      brandColor: '#667eea',
      brandColorSecondary: '#764ba2',
      footerText: '© 2025 Anna Manager Bot. All rights reserved.',
      enableAuditLogs: true,
      enableBulkOperations: true,
      enableDataExport: true,
      maintenanceMode: false
    };
    next();
  }
};

// Middleware to check maintenance mode
const checkMaintenance = (req, res, next) => {
  // Skip maintenance check for settings page and API
  if (req.path.includes('/settings') || req.path.includes('/api')) {
    return next();
  }
  
  if (res.locals.dashboardSettings && res.locals.dashboardSettings.maintenanceMode) {
    // Allow admins to bypass maintenance mode
    if (req.isAuthenticated()) {
      return next();
    }
    
    return res.status(503).render('maintenance', {
      title: 'Maintenance Mode',
      message: res.locals.dashboardSettings.maintenanceMessage
    });
  }
  
  next();
};

module.exports = {
  loadSettings,
  checkMaintenance
};
