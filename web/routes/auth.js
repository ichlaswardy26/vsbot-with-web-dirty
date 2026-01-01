/**
 * Authentication Routes
 * Discord OAuth2 authentication flow
 */

const express = require('express');
const passport = require('passport');
const router = express.Router();
const { auditLogger, AuditEventType } = require('../services/auditLogger');

/**
 * GET /auth/discord
 * Initiate Discord OAuth2 flow
 */
router.get('/discord', passport.authenticate('discord'));

/**
 * GET /auth/discord/callback
 * Handle Discord OAuth2 callback
 */
router.get('/discord/callback', 
  passport.authenticate('discord', { failureRedirect: '/auth/failed' }),
  async (req, res) => {
    try {
      // Log successful authentication
      await auditLogger.logAuth(AuditEventType.AUTH_LOGIN, req, true);
      
      // Redirect to dashboard
      res.redirect('/dashboard');
    } catch (error) {
      console.error('[Auth] Error in callback:', error);
      res.redirect('/auth/failed');
    }
  }
);

/**
 * GET /auth/failed
 * Authentication failure page
 */
router.get('/failed', async (req, res) => {
  // Log failed authentication
  await auditLogger.logAuth(AuditEventType.AUTH_FAILED, req, false, 'OAuth2 authentication failed');
  
  res.status(401).json({
    success: false,
    error: 'Authentication failed',
    message: 'Please try logging in again'
  });
});

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout', async (req, res) => {
  try {
    if (req.user) {
      // Log logout
      await auditLogger.logAuth(AuditEventType.AUTH_LOGOUT, req, true);
    }
    
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({
          success: false,
          error: 'Logout failed'
        });
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('[Auth] Session destroy error:', err);
        }
        
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      });
    });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * GET /auth/user
 * Get current user information
 */
router.get('/user', (req, res) => {
  if (req.user) {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar ? 
          `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png` : 
          null,
        guilds: req.user.guilds?.filter(guild => 
          (guild.permissions & 0x8) === 0x8 // Administrator permission
        ) || []
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }
});

/**
 * GET /auth/guilds
 * Get user's accessible guilds
 */
router.get('/guilds', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }
  
  // Filter guilds where user has administrator permissions
  const adminGuilds = req.user.guilds?.filter(guild => 
    (guild.permissions & 0x8) === 0x8
  ) || [];
  
  res.json({
    success: true,
    guilds: adminGuilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon ? 
        `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : 
        null,
      permissions: guild.permissions
    }))
  });
});

module.exports = router;