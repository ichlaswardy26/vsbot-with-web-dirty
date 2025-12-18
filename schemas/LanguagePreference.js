const mongoose = require('mongoose');

/**
 * Language Preference Schema
 * Stores user and guild language preferences
 */
const languagePreferenceSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['user', 'guild'],
        required: true
    },
    language: {
        type: String,
        required: true,
        default: 'id'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for unique user/guild preferences
languagePreferenceSchema.index({ id: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('LanguagePreference', languagePreferenceSchema);
