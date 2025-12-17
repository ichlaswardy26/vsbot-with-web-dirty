const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    sparse: true
  },
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  discriminator: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  guilds: [{
    id: String,
    name: String,
    icon: String,
    permissions: Number,
    owner: Boolean
  }],
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update last activity on save
userSessionSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

module.exports = mongoose.model('UserSession', userSessionSchema);