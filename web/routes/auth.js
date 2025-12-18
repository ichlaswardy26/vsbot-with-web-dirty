const express = require('express');
const passport = require('passport');
const router = express.Router();

/**
 * GET /auth/discord
 * Initiate Discord OAuth2 authentication
 */
router.get('/discord', passport.authenticate('discord'));

/**
 * GET /auth/discord/callback
 * Handle Discord OAuth2 callback
 */
router.get('/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: '/auth/error' 
  }),
  (req, res) => {
    // Successful authentication
    const redirectUrl = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  }
);

/**
 * GET /auth/error
 * Authentication error page
 */
router.get('/error', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Authentication failed',
    message: 'Failed to authenticate with Discord. Please try again.'
  });
});

/**
 * POST /auth/logout
 * Logout user and destroy session
 */
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Session cleanup failed'
        });
      }
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
});

/**
 * GET /auth/user
 * Get current user information
 */
router.get('/user', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  res.json({
    success: true,
    data: {
      userId: req.user.userId,
      username: req.user.username,
      discriminator: req.user.discriminator,
      avatar: req.user.avatar,
      guilds: req.user.guilds
    }
  });
});

/**
 * GET /auth/guilds
 * Get guilds where user has admin permissions
 */
router.get('/guilds', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  const allGuilds = req.user.guilds || [];
  
  // Debug: log all guilds and their permissions
  console.log(`[Auth] User ${req.user.username} has ${allGuilds.length} guilds`);
  
  // Filter guilds where user has Administrator permission (0x8) or is owner
  // Discord sends permissions as string for large numbers, so we need to handle both
  const adminGuilds = allGuilds.filter(guild => {
    // Owner always has access
    if (guild.owner) {
      console.log(`[Auth] Guild ${guild.name} (${guild.id}): owner=true`);
      return true;
    }
    
    // Convert permissions to BigInt for accurate bitwise operations
    const permissions = BigInt(guild.permissions || 0);
    const ADMINISTRATOR = BigInt(0x8);
    const hasAdmin = (permissions & ADMINISTRATOR) === ADMINISTRATOR;
    
    console.log(`[Auth] Guild ${guild.name} (${guild.id}): permissions=${guild.permissions}, hasAdmin=${hasAdmin}`);
    
    return hasAdmin;
  }).map(guild => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    owner: guild.owner
  }));

  console.log(`[Auth] Found ${adminGuilds.length} admin guilds for user ${req.user.username}`);

  res.json({
    success: true,
    data: adminGuilds
  });
});

/**
 * GET /auth/bot-guilds
 * Get guilds where the bot is installed
 */
router.get('/bot-guilds', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  try {
    // Get bot client from app
    const client = req.app.get('discordClient');
    
    if (!client || !client.guilds) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Get all guilds where bot is installed
    const botGuilds = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      memberCount: guild.memberCount
    }));
    
    console.log(`[Auth] Bot is in ${botGuilds.length} guilds`);
    
    res.json({
      success: true,
      data: botGuilds
    });
  } catch (error) {
    console.error('[Auth] Error getting bot guilds:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh user session and guild data
 */
router.post('/refresh', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  try {
    // In a real implementation, you would refresh the user's guild data
    // from Discord API using the refresh token
    res.json({
      success: true,
      message: 'Session refreshed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to refresh session'
    });
  }
});

module.exports = router;