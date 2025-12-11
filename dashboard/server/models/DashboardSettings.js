const mongoose = require('mongoose');

const dashboardSettingsSchema = new mongoose.Schema({
  // General Settings
  title: {
    type: String,
    default: 'Villain Seraphyx Manager Bot Dashboard'
  },
  subtitle: {
    type: String,
    default: 'Modern Dashboard untuk Mengontrol Bot Discord'
  },
  logoUrl: {
    type: String,
    default: ''
  },
  faviconUrl: {
    type: String,
    default: ''
  },
  
  // Branding
  brandName: {
    type: String,
    default: 'Villain Seraphyx Bot'
  },
  brandColor: {
    type: String,
    default: '#667eea'
  },
  brandColorSecondary: {
    type: String,
    default: '#764ba2'
  },
  
  // Footer
  footerText: {
    type: String,
    default: '© 2025 Villain Seraphyx Manager Bot. All rights reserved.'
  },
  footerLinks: [{
    name: String,
    url: String
  }],
  
  // Features
  enableAuditLogs: {
    type: Boolean,
    default: true
  },
  enableBulkOperations: {
    type: Boolean,
    default: true
  },
  enableDataExport: {
    type: Boolean,
    default: true
  },
  
  // Pagination
  usersPerPage: {
    type: Number,
    default: 20,
    min: 10,
    max: 100
  },
  levelsPerPage: {
    type: Number,
    default: 20,
    min: 10,
    max: 100
  },
  auditLogsPerPage: {
    type: Number,
    default: 50,
    min: 10,
    max: 100
  },
  
  // Maintenance
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'Dashboard is under maintenance. Please check back later.'
  },
  
  // Notifications
  enableNotifications: {
    type: Boolean,
    default: true
  },
  notificationSound: {
    type: Boolean,
    default: false
  },
  
  // Security
  sessionTimeout: {
    type: Number,
    default: 7, // days
    min: 1,
    max: 30
  },
  maxLoginAttempts: {
    type: Number,
    default: 5,
    min: 3,
    max: 10
  },
  
  // Analytics
  enableAnalytics: {
    type: Boolean,
    default: true
  },
  analyticsRefreshInterval: {
    type: Number,
    default: 10, // seconds
    min: 5,
    max: 60
  }
}, {
  timestamps: true
});

// Singleton pattern - only one settings document
dashboardSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

dashboardSettingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('DashboardSettings', dashboardSettingsSchema);
