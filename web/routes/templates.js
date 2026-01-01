/**
 * Configuration Templates API Routes
 * Manage configuration templates for quick setup
 */

const express = require('express');
const router = express.Router();
const configSync = require('../../util/configSync');
const { verifyAuth, verifyGuildAccess } = require('../middleware/auth');
const { validateGuildId } = require('../middleware/validation');

// Predefined configuration templates
const templates = {
  basic: {
    name: 'Basic Setup',
    description: 'Essential configuration for a new Discord server',
    category: 'starter',
    config: {
      features: {
        leveling: { enabled: true, xpCooldown: 60000, xpMin: 15, xpMax: 25 },
        welcome: { enabled: true, message: 'Welcome to the server!' },
        economy: { enabled: false }
      },
      colors: {
        primary: '#5865F2',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C'
      }
    }
  },
  gaming: {
    name: 'Gaming Community',
    description: 'Perfect setup for gaming communities with leveling and economy',
    category: 'community',
    config: {
      features: {
        leveling: { enabled: true, xpCooldown: 45000, xpMin: 20, xpMax: 35, voiceXpPerMinute: 15 },
        economy: { enabled: true, dailyReward: 150, collectCooldown: 3600000 },
        games: { enabled: true, wordChainTimeout: 30000 },
        voice: { enabled: true, joinToCreateEnabled: true },
        welcome: { enabled: true, message: 'Welcome to our gaming community! 🎮' }
      },
      colors: {
        primary: '#7289DA',
        success: '#43B581',
        error: '#F04747',
        warning: '#FAA61A'
      }
    }
  },
  business: {
    name: 'Business/Professional',
    description: 'Clean setup for business and professional communities',
    category: 'professional',
    config: {
      features: {
        leveling: { enabled: false },
        economy: { enabled: false },
        welcome: { enabled: true, message: 'Welcome to our professional community!' },
        ticket: { enabled: true, prefix: 'support' },
        autoResponder: { enabled: true }
      },
      colors: {
        primary: '#2C3E50',
        success: '#27AE60',
        error: '#E74C3C',
        warning: '#F39C12'
      }
    }
  },
  educational: {
    name: 'Educational',
    description: 'Setup for educational institutions and learning communities',
    category: 'education',
    config: {
      features: {
        leveling: { enabled: true, xpCooldown: 120000, xpMin: 10, xpMax: 20 },
        economy: { enabled: false },
        welcome: { enabled: true, message: 'Welcome to our learning community! 📚' },
        ticket: { enabled: true, prefix: 'help' },
        confession: { enabled: false }
      },
      colors: {
        primary: '#3498DB',
        success: '#2ECC71',
        error: '#E74C3C',
        warning: '#F1C40F'
      }
    }
  }
};

/**
 * GET /api/templates
 * Get all available templates
 */
router.get('/', verifyAuth, async (req, res) => {
  try {
    const templateList = Object.entries(templates).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      category: template.category
    }));

    res.json({
      success: true,
      data: {
        templates: templateList,
        categories: ['starter', 'community', 'professional', 'education']
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
 * Get specific template details
 */
router.get('/:templateId', verifyAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = templates[templateId];

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: templateId,
        ...template
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
 * POST /api/templates/:templateId/apply/:guildId
 * Apply template to a guild
 */
router.post('/:templateId/apply/:guildId', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { templateId, guildId } = req.params;
    const { overwrite = false } = req.body;
    const userId = req.user.id;

    const template = templates[templateId];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Get current config if not overwriting
    let updates = template.config;
    if (!overwrite) {
      const currentConfig = await configSync.getConfig(guildId);
      
      // Merge with current config (template values take precedence for enabled features)
      updates = {
        ...currentConfig,
        ...template.config,
        features: {
          ...currentConfig.features,
          ...template.config.features
        },
        colors: {
          ...currentConfig.colors,
          ...template.config.colors
        }
      };
    }

    // Apply the template
    const updatedConfig = await configSync.updateConfig(guildId, updates, {
      userId,
      source: `template_${templateId}`,
      validateWithBot: true,
      broadcastUpdate: true
    });

    res.json({
      success: true,
      data: updatedConfig,
      message: `Template "${template.name}" applied successfully`
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to apply template'
    });
  }
});

/**
 * POST /api/templates/:templateId/preview/:guildId
 * Preview template changes without applying
 */
router.post('/:templateId/preview/:guildId', validateGuildId, verifyAuth, verifyGuildAccess, async (req, res) => {
  try {
    const { templateId, guildId } = req.params;
    const { overwrite = false } = req.body;

    const template = templates[templateId];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Get current config
    const currentConfig = await configSync.getConfig(guildId);
    
    // Calculate what would change
    let previewConfig = template.config;
    if (!overwrite) {
      previewConfig = {
        ...currentConfig,
        ...template.config,
        features: {
          ...currentConfig.features,
          ...template.config.features
        },
        colors: {
          ...currentConfig.colors,
          ...template.config.colors
        }
      };
    }

    // Calculate differences
    const changes = calculateConfigDifferences(currentConfig, previewConfig);

    res.json({
      success: true,
      data: {
        template: {
          id: templateId,
          name: template.name,
          description: template.description
        },
        currentConfig,
        previewConfig,
        changes,
        overwrite
      }
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview template'
    });
  }
});

/**
 * Calculate differences between two configurations
 */
function calculateConfigDifferences(current, preview) {
  const changes = {
    added: {},
    modified: {},
    removed: {}
  };

  // Compare features
  const currentFeatures = current.features || {};
  const previewFeatures = preview.features || {};

  Object.keys(previewFeatures).forEach(key => {
    if (!currentFeatures[key]) {
      changes.added[`features.${key}`] = previewFeatures[key];
    } else if (JSON.stringify(currentFeatures[key]) !== JSON.stringify(previewFeatures[key])) {
      changes.modified[`features.${key}`] = {
        from: currentFeatures[key],
        to: previewFeatures[key]
      };
    }
  });

  // Compare colors
  const currentColors = current.colors || {};
  const previewColors = preview.colors || {};

  Object.keys(previewColors).forEach(key => {
    if (!currentColors[key]) {
      changes.added[`colors.${key}`] = previewColors[key];
    } else if (currentColors[key] !== previewColors[key]) {
      changes.modified[`colors.${key}`] = {
        from: currentColors[key],
        to: previewColors[key]
      };
    }
  });

  return changes;
}

module.exports = router;