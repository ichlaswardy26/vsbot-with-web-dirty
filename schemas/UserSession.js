/**
 * User Session Schema
 * Stores Discord OAuth2 session data
 */

const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
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
    default: '0000'
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
    required: true
  }
}, {
  timestamps: true
});

// Index for cleanup
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('UserSession', userSessionSchema);