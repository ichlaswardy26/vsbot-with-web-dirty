const express = require('express');
const router = express.Router();
const configManager = require('../../util/configManager');
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');
const { validateGuildId, validateConfigSection, sanitizeInput, validateConfigStructure } = require('../middleware/validation');

// ==================== GET ROUTES ====================

/**
 * GET /api/config/:guildId
 * Get full configuration for a guild
 */
router.get('/:guildId', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await configManager.getConfig(guildId);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

/**
 * GET /api/config/:guildId/:section
 * Get specific configuration section
 */
router.get('/:guildId/:section', validateGuildId, validateConfigSection, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId, section } = req.params;
    const sectionData = await configManager.getConfigSection(guildId, section);
    
    res.json({
      success: true,
      data: sectionData
    });
  } catch (error) {
    console.error('Error getting config section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration section'
    });
  }
});

// ==================== PUT ROUTES ====================

/**
 * PUT /api/config/:guildId
 * Update full configuration for a guild
 * Requirements: 9.2 - Broadcasts changes via WebSocket
 */
router.put('/:guildId', validateGuildId, sanitizeInput, validateConfigStructure, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    
    // Validate configuration
    const validation = configManager.validateConfig(updates);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration',
        details: validation.errors
      });
    }
    
    const config = await configManager.updateConfig(guildId, updates, userId);
    
    // Broadcast configuration change via WebSocket
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.broadcastConfigChange(guildId, 'full', updates, {
        userId: req.user.id,
        username: req.user.username
      });
    }
    
    res.json({
      success: true,
      data: config,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating config:', error);
    
    // Broadcast error via WebSocket
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.broadcastConfigError(req.params.guildId, 'full', error);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

/**
 * PUT /api/config/:guildId/:section
 * Update specific configuration section
 * Requirements: 9.2 - Broadcasts changes via WebSocket
 */
router.put('/:guildId/:section', validateGuildId, validateConfigSection, sanitizeInput, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId, section } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    
    const sectionData = await configManager.updateConfigSection(guildId, section, updates, userId);
    
    // Broadcast configuration change via WebSocket
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.broadcastConfigChange(guildId, section, updates, {
        userId: req.user.id,
        username: req.user.username
      });
    }
    
    res.json({
      success: true,
      data: sectionData,
      message: `${section} configuration updated successfully`
    });
  } catch (error) {
    console.error('Error updating config section:', error);
    
    // Broadcast error via WebSocket
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.broadcastConfigError(req.params.guildId, req.params.section, error);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration section'
    });
  }
});

// ==================== UTILITY ROUTES ====================

/**
 * POST /api/config/:guildId/validate
 * Validate configuration without saving
 * Requirements: 7.1, 7.2, 7.3
 */
router.post('/:guildId/validate', verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const config = req.body;
    const validation = configManager.validateConfigWithDetails(config);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate configuration'
    });
  }
});

/**
 * POST /api/config/:guildId/validate/field
 * Validate a single field in real-time
 * Requirements: 7.1
 */
router.post('/:guildId/validate/field', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { fieldName, value, fieldType } = req.body;
    
    // Perform real-time field validation
    const validation = configManager.validateField(fieldName, value, fieldType);
    
    res.json({
      success: true,
      data: {
        fieldName,
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings || [],
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error validating field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate field'
    });
  }
});

/**
 * POST /api/config/:guildId/validate/conflicts
 * Detect configuration conflicts and provide resolution suggestions
 * Requirements: 7.5
 */
router.post('/:guildId/validate/conflicts', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const config = req.body;
    const conflicts = configManager.detectConflicts(config);
    
    res.json({
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflicts,
        canAutoResolve: conflicts.some(c => c.autoResolvable)
      }
    });
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect conflicts'
    });
  }
});

/**
 * POST /api/config/:guildId/resolve-conflict
 * Apply automatic conflict resolution
 * Requirements: 7.5
 */
router.post('/:guildId/resolve-conflict', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { conflictId, action } = req.body;
    const userId = req.user.id;
    
    const result = await configManager.resolveConflict(guildId, conflictId, action, userId);
    
    res.json({
      success: true,
      data: {
        resolved: result.resolved,
        appliedResolution: result.appliedResolution,
        message: `Conflict resolved using: ${action}`
      }
    });
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve conflict'
    });
  }
});

/**
 * POST /api/config/:guildId/export
 * Export configuration to JSON
 * Requirements: 6.1
 */
router.post('/:guildId/export', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await configManager.exportConfig(guildId);
    
    res.json({
      success: true,
      data: config,
      filename: `config-${guildId}-${Date.now()}.json`
    });
  } catch (error) {
    console.error('Error exporting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export configuration'
    });
  }
});

/**
 * POST /api/config/:guildId/import/preview
 * Preview configuration import - shows changes before applying
 * Requirements: 6.2, 6.3
 */
router.post('/:guildId/import/preview', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const configData = req.body;
    
    const preview = await configManager.previewImport(guildId, configData);
    
    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error('Error previewing import:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to preview import'
    });
  }
});

/**
 * POST /api/config/:guildId/import
 * Import configuration from JSON
 * Requirements: 6.2, 6.4, 6.5
 */
router.post('/:guildId/import', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const configData = req.body;
    const userId = req.user.id;
    
    const result = await configManager.importConfig(guildId, configData, userId);
    
    res.json({
      success: true,
      data: result.data,
      warnings: result.warnings,
      appliedSections: result.appliedSections,
      message: 'Configuration imported successfully'
    });
  } catch (error) {
    console.error('Error importing config:', error);
    
    // Return detailed validation errors
    const response = {
      success: false,
      error: error.message || 'Failed to import configuration'
    };
    
    if (error.validationErrors) {
      response.validationErrors = error.validationErrors;
    }
    if (error.validationWarnings) {
      response.validationWarnings = error.validationWarnings;
    }
    
    res.status(400).json(response);
  }
});

/**
 * POST /api/config/:guildId/backup
 * Create a backup of current configuration
 * Requirements: 6.1
 */
router.post('/:guildId/backup', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const backup = await configManager.createBackup(guildId);
    
    res.json({
      success: true,
      data: backup,
      filename: `backup-${guildId}-${Date.now()}.json`
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

/**
 * POST /api/config/:guildId/restore
 * Restore configuration from backup
 * Requirements: 6.5
 */
router.post('/:guildId/restore', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const backupData = req.body;
    const userId = req.user.id;
    
    const result = await configManager.restoreFromBackup(guildId, backupData, userId);
    
    res.json({
      success: true,
      data: result.data,
      message: 'Configuration restored from backup successfully'
    });
  } catch (error) {
    console.error('Error restoring from backup:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to restore from backup'
    });
  }
});

/**
 * DELETE /api/config/:guildId/cache
 * Clear configuration cache
 */
router.delete('/:guildId/cache', verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    configManager.clearCache(guildId);
    
    res.json({
      success: true,
      message: 'Configuration cache cleared'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

/**
 * POST /api/config/:guildId/reset
 * Reset configuration to defaults
 */
router.post('/:guildId/reset', verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const userId = req.user.id;
    
    // Create new default config
    const defaultConfig = configManager.getDefaultConfig(guildId);
    const config = await configManager.updateConfig(guildId, defaultConfig, userId);
    
    res.json({
      success: true,
      data: config,
      message: 'Configuration reset to defaults'
    });
  } catch (error) {
    console.error('Error resetting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset configuration'
    });
  }
});

module.exports = router;