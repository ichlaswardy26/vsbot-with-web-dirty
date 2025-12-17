const express = require('express');
const router = express.Router();
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');
const templateManager = require('../../util/templateManager');

/**
 * GET /api/templates
 * Get all available configuration templates
 * Requirements: 10.1
 */
router.get('/', verifyAuth, async (req, res) => {
  try {
    const { guildId } = req.query;
    const templates = await templateManager.getTemplates(guildId);
    
    // Group templates by category for easier display
    const grouped = templates.reduce((acc, template) => {
      const category = template.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        category: template.category,
        type: template.type,
        createdBy: template.createdBy,
        usageCount: template.metadata?.usageCount || 0
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        templates: templates.map(t => ({
          templateId: t.templateId,
          name: t.name,
          description: t.description,
          category: t.category,
          type: t.type,
          createdBy: t.createdBy,
          usageCount: t.metadata?.usageCount || 0
        })),
        grouped,
        categories: Object.keys(grouped)
      }
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

/**
 * GET /api/templates/:templateId
 * Get specific template by ID
 * Requirements: 10.1
 */
router.get('/:templateId', verifyAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await templateManager.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        category: template.category,
        type: template.type,
        createdBy: template.createdBy,
        config: template.config,
        metadata: template.metadata
      }
    });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template'
    });
  }
});

/**
 * POST /api/templates/:templateId/preview/:guildId
 * Preview template application without saving
 * Requirements: 10.2, 10.3
 */
router.post('/:templateId/preview/:guildId', verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { templateId, guildId } = req.params;
    
    const preview = await templateManager.previewTemplate(templateId, guildId);

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    
    if (error.message === 'Template not found') {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to preview template'
    });
  }
});

/**
 * POST /api/templates/:templateId/apply/:guildId
 * Apply template to guild configuration
 * Requirements: 10.3, 10.4
 */
router.post('/:templateId/apply/:guildId', verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { templateId, guildId } = req.params;
    const { merge = true, conflictResolutions = {} } = req.body;
    const userId = req.user.userId;

    const result = await templateManager.applyTemplate(templateId, guildId, userId, {
      merge,
      conflictResolutions
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error applying template:', error);
    
    if (error.message === 'Template not found') {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to apply template'
    });
  }
});

/**
 * POST /api/templates/custom
 * Create custom template from current configuration
 * Requirements: 10.5
 */
router.post('/custom', verifyAuth, async (req, res) => {
  try {
    const { name, description, guildId, config } = req.body;
    const userId = req.user.userId;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }

    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid configuration object is required'
      });
    }

    const template = await templateManager.createCustomTemplate({
      name,
      description,
      guildId,
      config,
      createdBy: userId
    });

    res.json({
      success: true,
      data: {
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        category: template.category,
        type: template.type,
        createdBy: template.createdBy,
        createdAt: template.metadata.createdAt
      },
      message: 'Custom template created successfully'
    });
  } catch (error) {
    console.error('Error creating custom template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create custom template'
    });
  }
});

/**
 * POST /api/templates/custom/from-config/:guildId
 * Create custom template from guild's current configuration
 * Requirements: 10.5
 */
router.post('/custom/from-config/:guildId', verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.userId;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }

    // Get current guild configuration
    const configManager = require('../../util/configManager');
    const currentConfig = await configManager.getConfig(guildId);

    // Extract only the configuration sections (not metadata)
    const configToSave = {
      channels: currentConfig.channels,
      categories: currentConfig.categories,
      roles: currentConfig.roles,
      emojis: currentConfig.emojis,
      images: currentConfig.images,
      features: currentConfig.features,
      colors: currentConfig.colors,
      language: currentConfig.language
    };

    const template = await templateManager.createCustomTemplate({
      name,
      description: description || `Custom template created from guild ${guildId}`,
      guildId,
      config: configToSave,
      createdBy: userId
    });

    res.json({
      success: true,
      data: {
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        category: template.category,
        type: template.type,
        createdBy: template.createdBy,
        createdAt: template.metadata.createdAt
      },
      message: 'Custom template created from current configuration'
    });
  } catch (error) {
    console.error('Error creating custom template from config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create custom template'
    });
  }
});

/**
 * PUT /api/templates/custom/:templateId
 * Update a custom template
 * Requirements: 10.5
 */
router.put('/custom/:templateId', verifyAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, description, config } = req.body;
    const userId = req.user.userId;

    const template = await templateManager.updateCustomTemplate(templateId, {
      name,
      description,
      config
    }, userId);

    res.json({
      success: true,
      data: {
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        updatedAt: template.metadata.updatedAt
      },
      message: 'Custom template updated successfully'
    });
  } catch (error) {
    console.error('Error updating custom template:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Custom template not found'
      });
    }
    
    if (error.message.includes('Only the template creator')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update custom template'
    });
  }
});

/**
 * DELETE /api/templates/custom/:templateId
 * Delete a custom template
 * Requirements: 10.5
 */
router.delete('/custom/:templateId', verifyAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.userId;

    await templateManager.deleteCustomTemplate(templateId, userId);

    res.json({
      success: true,
      message: 'Custom template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom template:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Custom template not found'
      });
    }
    
    if (error.message.includes('Only the template creator')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete custom template'
    });
  }
});

/**
 * GET /api/templates/user/my-templates
 * Get templates created by the current user
 * Requirements: 10.5
 */
router.get('/user/my-templates', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { guildId } = req.query;

    const templates = await templateManager.getUserTemplates(userId, guildId);

    res.json({
      success: true,
      data: templates.map(t => ({
        templateId: t.templateId,
        name: t.name,
        description: t.description,
        category: t.category,
        guildId: t.guildId,
        createdAt: t.metadata.createdAt,
        updatedAt: t.metadata.updatedAt,
        usageCount: t.metadata.usageCount
      }))
    });
  } catch (error) {
    console.error('Error getting user templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user templates'
    });
  }
});

module.exports = router;
