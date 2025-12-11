const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true
  },
  adminUsername: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'USER_UPDATE',
      'USER_DELETE',
      'LEVEL_UPDATE',
      'CONFIG_UPDATE',
      'BULK_OPERATION',
      'DATA_EXPORT',
      'LOGIN',
      'LOGOUT'
    ]
  },
  targetType: {
    type: String,
    enum: ['USER', 'LEVEL', 'CONFIG', 'SYSTEM']
  },
  targetId: {
    type: String
  },
  changes: {
    type: mongoose.Schema.Types.Mixed
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
