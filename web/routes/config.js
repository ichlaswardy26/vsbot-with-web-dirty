const express = require('express');
const router = express.Router();
const configManager = require('../../util/configManager');
const configSync = require('../../util/configSync');
const config = require('../../config');
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');
const { validateGuildId, validateConfigSection, sanitizeInput, validateConfigStructure } = require('../middleware/validation');
const { auditLogger } = require('../services/auditLogger');
const { cacheService, CacheKeys, CacheTTL } = require('../services/cacheService');
const { 
  getDashboardOverview, 
  getConfigurationAnalytics, 
  getBotIntegrationStatus, 
  validateConfiguration, 
  getConfigurationSuggestions 
} = require('../controllers/dashboardController');

// ==================== DASHBOARD ROUTES ====================

/**
 * GET /api/config/:guildId/dashboard
 * Get comprehensive dashboard overview with analytics
 */
router.get('/:guildId/dashboard', validateGuildId, verifyAuth, verifyGuildAccess, getDashboardOverview);

/**
 * GET /api/config/:guildId/analytics
 * Get configuration analytics and change history
 */
router.get('/:guildId/analytics', validateGuildId, verifyAuth, verifyGuildAccess, getConfigurationAnalytics);

/**
 * GET /api/config/:guildId/bot-status
 * Get bot integration status and capabilities
 */
router.get('/:guildId/bot-status', validateGuildId, verifyAuth, verifyGuildAccess, getBotIntegrationStatus);

/**
 * GET /api/config/:guildId/validate
 * Validate configuration in real-time
 */
router.get('/:guildId/validate', validateGuildId, verifyAuth, verifyGuildAccess, validateConfiguration);

/**
 * GET /api/config/:guildId/suggestions
 * Get configuration suggestions based on guild analysis
 */
router.get('/:guildId/suggestions', validateGuildId, verifyAuth, verifyGuildAccess, getConfigurationSuggestions);

// ==================== GET ROUTES ====================

/**
 * GET /api/config/:guildId
 * Get full configuration for a guild with enhanced sync
 * Performance: Uses enhanced sync service with bot validation
 */
router.get('/:guildId', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { validate = 'false' } = req.query;
    
    // Use enhanced config sync service for unified access
    const config = await configSync.getConfig(guildId, false, validate === 'true');
    
    res.json({
      success: true,
      data: config,
      version: configSync.configVersions.get(guildId) || 1,
      syncStats: configSync.getSyncStats(),
      validated: validate === 'true',
      timestamp: Date.now()
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
 * GET /api/config/:guildId/progress
 * Get configuration progress for dashboard overview
 * Requirements: Task 18 - Configuration progress indicators
 * NOTE: This route MUST be defined before /:guildId/:section to avoid being caught by it
 */
router.get('/:guildId/progress', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await configSync.getConfig(guildId);
    
    // Calculate progress for each section
    const progress = {
      channels: calculateSectionProgress(config.channels, [
        'welcome', 'log', 'levelUp', 'confession', 'ticketCategory', 
        'voiceCreate', 'giveaway', 'snipe', 'wordChain'
      ]),
      roles: calculateSectionProgress(config.roles, [
        'admin', 'moderator', 'muted', 'levelRoles'
      ]),
      features: calculateFeaturesProgress(config.features),
      appearance: calculateSectionProgress(config.appearance, [
        'embedColor', 'successColor', 'errorColor', 'warningColor'
      ])
    };
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error getting config progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration progress'
    });
  }
});

/**
 * GET /api/config/:guildId/:section
 * Get specific configuration section
 * Performance: Uses sync service with section-specific access
 */
router.get('/:guildId/:section', validateGuildId, validateConfigSection, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId, section } = req.params;
    
    // Get full config from sync service
    const fullConfig = await configSync.getConfig(guildId);
    const sectionData = fullConfig[section] || {};
    
    res.json({
      success: true,
      data: sectionData,
      version: configSync.configVersions.get(guildId) || 1
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
 * Update full configuration for a guild with enhanced validation
 * Requirements: 9.2 - Broadcasts changes via WebSocket with bot integration
 */
router.put('/:guildId', validateGuildId, sanitizeInput, validateConfigStructure, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    const { validateWithBot = 'true', atomic = 'true' } = req.query;
    
    // Use enhanced config sync service for update
    const updatedConfig = await configSync.updateConfig(guildId, updates, {
      userId,
      source: 'dashboard',
      validateWithBot: validateWithBot === 'true',
      broadcastUpdate: true,
      atomic: atomic === 'true'
    });
    
    // Audit log successful configuration change
    await auditLogger.logConfigChange(req, guildId, null, {
      oldConfig: await configSync.getConfig(guildId, true), // Force refresh for old config
      newConfig: updates,
      changedFields: Object.keys(updates)
    }, true);
    
    // Reload bot's config cache so changes take effect immediately
    try {
      await config.reloadConfig();
      console.log(`[Config] Bot config reloaded after dashboard update for guild ${guildId}`);
    } catch (reloadError) {
      console.error('[Config] Failed to reload bot config:', reloadError);
    }
    
    res.json({
      success: true,
      data: updatedConfig,
      version: configSync.configVersions.get(guildId),
      message: 'Configuration updated successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error updating config:', error);
    
    // Audit log error
    await auditLogger.logConfigChange(req, req.params.guildId, null, req.body, false, error.message);
    
    // Broadcast error via WebSocket
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.broadcastConfigError(req.params.guildId, 'full', error);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update configuration',
      timestamp: Date.now()
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
    
    // Get old section data for audit comparison
    const oldSectionData = await configManager.getConfigSection(guildId, section);
    
    const sectionData = await configManager.updateConfigSection(guildId, section, updates, userId);
    
    // Invalidate cache for this section and full config
    cacheService.invalidateSection(guildId, section);
    cacheService.delete(cacheService.generateKey(CacheKeys.CONFIG, guildId));
    
    // Audit log successful section update
    await auditLogger.logConfigChange(req, guildId, section, {
      oldValue: oldSectionData,
      newValue: updates,
      changedFields: Object.keys(updates)
    }, true);
    
    // Broadcast configuration change via WebSocket
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.broadcastConfigChange(guildId, section, updates, {
        userId: req.user.id,
        username: req.user.username
      });
    }
    
    // Reload bot's config cache so changes take effect immediately
    try {
      await config.reloadConfig();
      console.log(`[Config] Bot config reloaded after dashboard update for guild ${guildId} section ${section}`);
    } catch (reloadError) {
      console.error('[Config] Failed to reload bot config:', reloadError);
    }
    
    res.json({
      success: true,
      data: sectionData,
      message: `${section} configuration updated successfully`
    });
  } catch (error) {
    console.error('Error updating config section:', error);
    
    // Audit log error
    await auditLogger.logConfigChange(req, req.params.guildId, req.params.section, req.body, false, error.message);
    
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
    
    // Audit log export
    await auditLogger.logConfigExport(req, guildId);
    
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
    
    // Audit log successful import
    await auditLogger.logConfigImport(req, guildId, result.appliedSections, true);
    
    // Reload bot's config cache so changes take effect immediately
    try {
      await config.reloadConfig();
      console.log(`[Config] Bot config reloaded after import for guild ${guildId}`);
    } catch (reloadError) {
      console.error('[Config] Failed to reload bot config:', reloadError);
    }
    
    res.json({
      success: true,
      data: result.data,
      warnings: result.warnings,
      appliedSections: result.appliedSections,
      message: 'Configuration imported successfully'
    });
  } catch (error) {
    console.error('Error importing config:', error);
    
    // Audit log failed import
    await auditLogger.logConfigImport(req, req.params.guildId, [], false, error.message);
    
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
    
    // Reload bot's config cache so changes take effect immediately
    try {
      await config.reloadConfig();
      console.log(`[Config] Bot config reloaded after restore for guild ${guildId}`);
    } catch (reloadError) {
      console.error('[Config] Failed to reload bot config:', reloadError);
    }
    
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
 * Calculate progress for a configuration section
 */
function calculateSectionProgress(section, fields) {
  if (!section) return { percentage: 0, configured: 0, total: fields.length };
  
  let configured = 0;
  fields.forEach(field => {
    const value = section[field];
    if (value !== null && value !== undefined && value !== '' && 
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === 'object' && Object.keys(value).length === 0)) {
      configured++;
    }
  });
  
  return {
    percentage: Math.round((configured / fields.length) * 100),
    configured,
    total: fields.length
  };
}

/**
 * Calculate features progress
 */
function calculateFeaturesProgress(features) {
  if (!features) return { percentage: 0, enabled: 0, total: 8 };
  
  const featureKeys = ['leveling', 'economy', 'welcome', 'tickets', 'giveaways', 'autoResponder', 'wordChain', 'afk'];
  let enabled = 0;
  
  featureKeys.forEach(key => {
    if (features[key]?.enabled === true) enabled++;
  });
  
  return {
    percentage: Math.round((enabled / featureKeys.length) * 100),
    enabled,
    total: featureKeys.length
  };
}

/**
 * DELETE /api/config/:guildId/cache
 * Clear configuration cache
 */
router.delete('/:guildId/cache', verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Clear both configManager cache and cacheService cache
    configManager.clearCache(guildId);
    const cleared = cacheService.invalidateGuild(guildId);
    
    res.json({
      success: true,
      message: 'Configuration cache cleared',
      itemsCleared: cleared
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
 * GET /api/config/cache/stats
 * Get cache statistics for monitoring
 */
router.get('/cache/stats', verifyAuth, async (req, res) => {
  try {
    const stats = cacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
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
    const resetConfig = await configManager.updateConfig(guildId, defaultConfig, userId);
    
    // Reload bot's config cache so changes take effect immediately
    try {
      await config.reloadConfig();
      console.log(`[Config] Bot config reloaded after reset for guild ${guildId}`);
    } catch (reloadError) {
      console.error('[Config] Failed to reload bot config:', reloadError);
    }
    
    res.json({
      success: true,
      data: resetConfig,
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