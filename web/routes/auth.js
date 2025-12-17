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