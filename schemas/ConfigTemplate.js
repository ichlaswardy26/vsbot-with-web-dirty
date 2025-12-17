const mongoose = require('mongoose');

const configTemplateSchema = new mongoose.Schema({
  // Template identification
  templateId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Template metadata
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  
  category: {
    type: String,
    required: true,
    enum: ['Gaming', 'Education', 'Business', 'Community', 'Creative', 'Custom'],
    default: 'Custom'
  },
  
  // Template type: 'predefined' for system templates, 'custom' for user-created
  type: {
    type: String,
    enum: ['predefined', 'custom'],
    default: 'custom'
  },
  
  // For custom templates - who created it
  createdBy: {
    type: String,
    default: null
  },
  
  // For custom templates - which guild it belongs to (null for global)
  guildId: {
    type: String,
    default: null,
    index: true
  },
  
  // Template configuration data
  config: {
    // Channels configuration
    channels: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Categories configuration
    categories: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Roles configuration
    roles: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Emojis configuration
    emojis: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Images configuration
    images: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Features configuration
    features: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Colors configuration
    colors: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Language configuration
    language: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Template metadata
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    version: { type: String, default: '1.0.0' },
    usageCount: { type: Number, default: 0 }
  }
});

// Update timestamp on save
configTemplateSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

// Index for efficient queries
configTemplateSchema.index({ type: 1, category: 1 });
configTemplateSchema.index({ guildId: 1, type: 1 });

module.exports = mongoose.model('ConfigTemplate', configTemplateSchema);
