const mongoose = require('mongoose');

const levelingSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: [true, 'User ID is required'],
    trim: true
  },
  guildId: { 
    type: String, 
    required: [true, 'Guild ID is required'],
    trim: true
  },
  xp: { 
    type: Number, 
    default: 0,
    min: [0, 'XP cannot be negative']
  },
  level: { 
    type: Number, 
    default: 1,
    min: [1, 'Level cannot be less than 1']
  },
  lastVoiceXp: { 
    type: Date,
    default: null
  },
  lastMessageXp: { 
    type: Date,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Compound index untuk memastikan satu user hanya memiliki satu data level per server
levelingSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Pre-save middleware untuk validasi
levelingSchema.pre('save', function(next) {
  if (this.xp < 0) this.xp = 0;
  if (this.level < 1) this.level = 1;
  next();
});

// Add some helper methods
levelingSchema.methods.addXp = async function(amount) {
  try {
    this.xp += amount;
    await this.save();
    return true;
  } catch (error) {
    console.error('Error adding XP:', error);
    return false;
  }
};

levelingSchema.methods.setLastMessageXp = async function() {
  try {
    this.lastMessageXp = new Date();
    await this.save();
    return true;
  } catch (error) {
    console.error('Error updating lastMessageXp:', error);
    return false;
  }
};

const Leveling = mongoose.model('Leveling', levelingSchema);

// Add error handling for the model
Leveling.on('error', err => {
  console.error('Leveling Model Error:', err);
});

module.exports = Leveling;