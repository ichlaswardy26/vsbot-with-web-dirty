const mongoose = require('mongoose');

const customRoleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  roleId: {
    type: String,
    required: true,
    unique: true,
  },
  roleName: {
    type: String,
    required: true,
  },
  roleColor: {
    type: String,
    required: true,
  },
  roleIcon: {
    type: String, // URL atau base64 jika disimpan di DB (opsional, biasanya hanya ID atau URL cukup)
    required: false,
  },
  createdBy: {
    type: String,
    required: true, // user ID
  },
  members: {
    type: [String], // array of user IDs yang memiliki akses ke role
    default: [],
  },
  roleType: {
    type: String,
    enum: ['boost', 'donate'],
    required: true,
  },
  isBoostRole: {
    type: Boolean,
    default: false, // Menandakan jika ini adalah role Boost
  },
  isDonateRole: {
    type: Boolean,
    default: false, // Menandakan jika ini adalah role Donate
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CustomRole', customRoleSchema);