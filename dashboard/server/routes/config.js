const express = require('express');
const router = express.Router();
const BotConfig = require('../models/BotConfig');
const DiscordService = require('../services/DiscordService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Middleware untuk semua routes config
router.use(requireAuth);
router.use(requireAdmin);

// GET /config - Halaman utama konfigurasi
router.get('/', async (req, res) => {
  try {
    const [config, discordData] = await Promise.all([
      BotConfig.getConfig(),
      DiscordService.getFormattedData().catch(err => {
        console.error('Failed to fetch Discord data:', err.message);
        return null;
      })
    ]);

    res.render('config/index', {
      title: 'Bot Configuration',
      config: config.toMainBotFormat(),
      discordData,
      user: req.user,
      error: req.query.error,
      success: req.query.success
    });
  } catch (error) {
    console.error('Config page error:', error);
    res.render('config/index', {
      title: 'Bot Configuration',
      config: null,
      discordData: null,
      user: req.user,
      error: 'Failed to load configuration'
    });
  }
});

// GET /config/channels - Konfigurasi channels
router.get('/channels', async (req, res) => {
  try {
    const [config, discordData] = await Promise.all([
      BotConfig.getConfig(),
      DiscordService.getFormattedData()
    ]);

    res.render('config/channels', {
      title: 'Channel Configuration',
      config: config.channels,
      channels: discordData.channels,
      categories: discordData.categories,
      user: req.user
    });
  } catch (error) {
    console.error('Channels config error:', error);
    res.redirect('/dashboard/config?error=' + encodeURIComponent('Failed to load channel configuration'));
  }
});

// POST /config/channels - Update channels
router.post('/channels', async (req, res) => {
  try {
    const { channels } = req.body;
    
    // Validate channels exist in Discord
    const validation = await DiscordService.validateIds({ channels });
    
    await BotConfig.updateConfig({ channels }, req.user.id);
    
    // Emit real-time update
    req.app.get('io').emit('configUpdated', {
      section: 'channels',
      data: channels,
      validation,
      updatedBy: req.user.username,
      timestamp: new Date()
    });

    if (Object.keys(validation.invalid).length > 0) {
      res.redirect('/dashboard/config/channels?success=' + 
        encodeURIComponent(`Channels updated with ${Object.keys(validation.invalid).length} warnings`));
    } else {
      res.redirect('/dashboard/config/channels?success=' + 
        encodeURIComponent('Channels updated successfully'));
    }
  } catch (error) {
    console.error('Update channels error:', error);
    res.redirect('/dashboard/config/channels?error=' + 
      encodeURIComponent('Failed to update channels: ' + error.message));
  }
});

// GET /config/roles - Konfigurasi roles
router.get('/roles', async (req, res) => {
  try {
    const [config, discordData] = await Promise.all([
      BotConfig.getConfig(),
      DiscordService.getFormattedData()
    ]);

    res.render('config/roles', {
      title: 'Role Configuration',
      config: config.roles,
      roles: discordData.roles,
      user: req.user
    });
  } catch (error) {
    console.error('Roles config error:', error);
    res.redirect('/dashboard/config?error=' + encodeURIComponent('Failed to load role configuration'));
  }
});

// POST /config/roles - Update roles
router.post('/roles', async (req, res) => {
  try {
    const { roles } = req.body;
    
    // Validate roles exist in Discord
    const validation = await DiscordService.validateIds({ roles });
    
    await BotConfig.updateConfig({ roles }, req.user.id);
    
    // Emit real-time update
    req.app.get('io').emit('configUpdated', {
      section: 'roles',
      data: roles,
      validation,
      updatedBy: req.user.username,
      timestamp: new Date()
    });

    if (Object.keys(validation.invalid).length > 0) {
      res.redirect('/dashboard/config/roles?success=' + 
        encodeURIComponent(`Roles updated with ${Object.keys(validation.invalid).length} warnings`));
    } else {
      res.redirect('/dashboard/config/roles?success=' + 
        encodeURIComponent('Roles updated successfully'));
    }
  } catch (error) {
    console.error('Update roles error:', error);
    res.redirect('/dashboard/config/roles?error=' + 
      encodeURIComponent('Failed to update roles: ' + error.message));
  }
});

// GET /config/features - Konfigurasi features
router.get('/features', async (req, res) => {
  try {
    const config = await BotConfig.getConfig();

    res.render('config/features', {
      title: 'Feature Configuration',
      config: config.features,
      colors: config.colors,
      user: req.user
    });
  } catch (error) {
    console.error('Features config error:', error);
    res.redirect('/dashboard/config?error=' + encodeURIComponent('Failed to load feature configuration'));
  }
});

// POST /config/features - Update features
router.post('/features', async (req, res) => {
  try {
    const { features, colors } = req.body;
    
    // Validate numeric values
    if (features) {
      const numericFields = ['xpCooldown', 'xpMin', 'xpMax', 'voiceXpPerMinute', 'dailyReward', 'collectCooldown', 'customRolePrice', 'wordChainTimeout'];
      numericFields.forEach(field => {
        if (features[field] !== undefined) {
          features[field] = parseInt(features[field]) || 0;
        }
      });
    }
    
    const updateData = {};
    if (features) updateData.features = features;
    if (colors) updateData.colors = colors;
    
    await BotConfig.updateConfig(updateData, req.user.id);
    
    // Emit real-time update
    req.app.get('io').emit('configUpdated', {
      section: 'features',
      data: updateData,
      updatedBy: req.user.username,
      timestamp: new Date()
    });

    res.redirect('/dashboard/config/features?success=' + 
      encodeURIComponent('Features updated successfully'));
  } catch (error) {
    console.error('Update features error:', error);
    res.redirect('/dashboard/config/features?error=' + 
      encodeURIComponent('Failed to update features: ' + error.message));
  }
});

// GET /config/emojis - Konfigurasi emojis
router.get('/emojis', async (req, res) => {
  try {
    const [config, discordData] = await Promise.all([
      BotConfig.getConfig(),
      DiscordService.getFormattedData()
    ]);

    res.render('config/emojis', {
      title: 'Emoji Configuration',
      config: config.emojis,
      serverEmojis: discordData.emojis,
      user: req.user
    });
  } catch (error) {
    console.error('Emojis config error:', error);
    res.redirect('/dashboard/config?error=' + encodeURIComponent('Failed to load emoji configuration'));
  }
});

// POST /config/emojis - Update emojis
router.post('/emojis', async (req, res) => {
  try {
    const { emojis } = req.body;
    
    await BotConfig.updateConfig({ emojis }, req.user.id);
    
    // Emit real-time update
    req.app.get('io').emit('configUpdated', {
      section: 'emojis',
      data: emojis,
      updatedBy: req.user.username,
      timestamp: new Date()
    });

    res.redirect('/dashboard/config/emojis?success=' + 
      encodeURIComponent('Emojis updated successfully'));
  } catch (error) {
    console.error('Update emojis error:', error);
    res.redirect('/dashboard/config/emojis?error=' + 
      encodeURIComponent('Failed to update emojis: ' + error.message));
  }
});

// GET /config/images - Konfigurasi images
router.get('/images', async (req, res) => {
  try {
    const config = await BotConfig.getConfig();

    res.render('config/images', {
      title: 'Image Configuration',
      config: config.images,
      user: req.user
    });
  } catch (error) {
    console.error('Images config error:', error);
    res.redirect('/dashboard/config?error=' + encodeURIComponent('Failed to load image configuration'));
  }
});

// POST /config/images - Update images
router.post('/images', async (req, res) => {
  try {
    const { images } = req.body;
    
    await BotConfig.updateConfig({ images }, req.user.id);
    
    // Emit real-time update
    req.app.get('io').emit('configUpdated', {
      section: 'images',
      data: images,
      updatedBy: req.user.username,
      timestamp: new Date()
    });

    res.redirect('/dashboard/config/images?success=' + 
      encodeURIComponent('Images updated successfully'));
  } catch (error) {
    console.error('Update images error:', error);
    res.redirect('/dashboard/config/images?error=' + 
      encodeURIComponent('Failed to update images: ' + error.message));
  }
});

// API Routes untuk AJAX requests

// GET /config/api/discord-data - Fetch fresh Discord data
router.get('/api/discord-data', async (req, res) => {
  try {
    // Clear cache untuk data fresh
    DiscordService.clearCache();
    const discordData = await DiscordService.getFormattedData();
    res.json({ success: true, data: discordData });
  } catch (error) {
    console.error('Fetch Discord data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /config/api/validate - Validate current config
router.get('/api/validate', async (req, res) => {
  try {
    const config = await BotConfig.getConfig();
    const validation = await DiscordService.validateIds(config.toMainBotFormat());
    res.json({ success: true, validation });
  } catch (error) {
    console.error('Validate config error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /config/api/export - Export config
router.post('/api/export', async (req, res) => {
  try {
    const config = await BotConfig.getConfig();
    const exportData = {
      config: config.toMainBotFormat(),
      metadata: {
        exportedAt: new Date(),
        exportedBy: req.user.username,
        version: config.version
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="bot-config-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Export config error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /config/api/import - Import config
router.post('/api/import', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ success: false, error: 'No config data provided' });
    }
    
    // Validate imported config
    const validation = await DiscordService.validateIds(config);
    
    await BotConfig.updateConfig(config, req.user.id);
    
    // Emit real-time update
    req.app.get('io').emit('configUpdated', {
      section: 'all',
      data: config,
      validation,
      updatedBy: req.user.username,
      timestamp: new Date(),
      imported: true
    });
    
    res.json({ 
      success: true, 
      message: 'Configuration imported successfully',
      validation 
    });
  } catch (error) {
    console.error('Import config error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;