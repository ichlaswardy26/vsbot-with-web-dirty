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
  (req, res, next) => {
    console.log(`[Auth] OAuth callback received`);
    console.log(`[Auth] Query params:`, req.query);
    console.log(`[Auth] Session ID:`, req.sessionID);
    next();
  },
  passport.authenticate('discord', { 
    failureRedirect: '/auth/failed',
    failureMessage: true
  }),
  async (req, res) => {
    try {
      console.log(`[Auth] OAuth callback successful for user: ${req.user.username}`);
      
      // Log successful authentication
      await auditLogger.logAuth(AuditEventType.AUTH_LOGIN, req, true);
      
      // Ensure session is saved before redirect
      req.session.save((err) => {
        if (err) {
          console.error('[Auth] Session save error:', err);
          return res.redirect('/auth/failed');
        }
        
        console.log(`[Auth] Session saved, redirecting to dashboard`);
        res.redirect('/dashboard');
      });
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

/**
 * GET /auth/debug
 * Debug authentication status (development only)
 */
router.get('/debug', (req, res) => {
  const config = require('../../config');
  
  // Only allow in development or when explicitly enabled
  if (config.nodeEnv === 'production' && !process.env.ENABLE_AUTH_DEBUG) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({
    success: true,
    debug: {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user || null,
      session: {
        cookie: req.session?.cookie,
        passport: req.session?.passport
      },
      headers: {
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        referer: req.headers.referer,
        cookie: req.headers.cookie ? 'Present' : 'Missing'
      },
      config: {
        callbackUrl: config.web?.discordCallbackUrl,
        clientId: config.clientId,
        nodeEnv: config.nodeEnv,
        sessionSecret: config.web?.sessionSecret ? 'Set' : 'Missing'
      }
    }
  });
});

module.exports = router;