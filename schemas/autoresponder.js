const mongoose = require('mongoose');

const responderSchema = new mongoose.Schema({
  trigger: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  response: { 
    type: String, 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Responder', responderSchema);