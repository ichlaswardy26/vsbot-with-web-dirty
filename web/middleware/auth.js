/**
 * Authentication Middleware
 * Discord OAuth2 integration with session management
 * Fixed for authentication loop issues
 */

const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const UserSession = require('../../schemas/UserSession');

/**
 * Configure Passport with Discord OAuth2 strategy
 */
function configurePassport() {
  const config = require('../../config');
  
  // Validate configuration
  if (!config.clientId || !config.web.discordClientSecret) {
    console.error('[Auth] Missing Discord OAuth2 configuration');
    return;
  }
  
  console.log('[Auth] Configuring Discord OAuth2 strategy');
  console.log(`[Auth] Client ID: ${config.clientId}`);
  console.log(`[Auth] Callback URL: ${config.web.discordCallbackUrl}`);
  
  passport.use(new DiscordStrategy({
    clientID: config.clientId,
    clientSecret: config.web.discordClientSecret,
    callbackURL: config.web.discordCallbackUrl,
    scope: ['identify', 'guilds']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log(`[Auth] Discord OAuth callback for user: ${profile.username}#${profile.discriminator}`);
      
      // Save or update user session
      const userSession = await UserSession.findOneAndUpdate(
        { userId: profile.id },
        {
          userId: profile.id,
          username: profile.username,
          discriminator: profile.discriminator,
          avatar: profile.avatar,
          guilds: profile.guilds || [],
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        },
        { upsert: true, new: true }
      );

      console.log(`[Auth] User session saved for ${profile.username}`);

      return done(null, {
        id: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        guilds: profile.guilds || []
      });
    } catch (error) {
      console.error('[Auth] Error in Discord strategy:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    console.log(`[Auth] Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      console.log(`[Auth] Deserializing user: ${id}`);
      
      const userSession = await UserSession.findOne({ userId: id });
      if (!userSession) {
        console.log(`[Auth] No session found for user: ${id}`);
        return done(null, false);
      }

      // Check if session is expired
      if (userSession.expiresAt < new Date()) {
        console.log(`[Auth] Session expired for user: ${id}`);
        await UserSession.deleteOne({ userId: id });
        return done(null, false);
      }

      console.log(`[Auth] User session valid for: ${userSession.username}`);
      
      done(null, {
        id: userSession.userId,
        username: userSession.username,
        discriminator: userSession.discriminator,
        avatar: userSession.avatar,
        guilds: userSession.guilds
      });
    } catch (error) {
      console.error('[Auth] Error deserializing user:', error);
      done(error, null);
    }
  });
}

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
  console.log(`[Auth] Checking authentication for ${req.method} ${req.path}`);
  console.log(`[Auth] User authenticated: ${req.isAuthenticated()}`);
  console.log(`[Auth] Session ID: ${req.sessionID}`);
  
  if (req.isAuthenticated()) {
    console.log(`[Auth] User ${req.user.username} is authenticated`);
    return next();
  }
  
  console.log(`[Auth] User not authenticated, redirecting to Discord OAuth`);
  
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      redirectUrl: '/auth/discord'
    });
  }
  
  res.redirect('/auth/discord');
}

/**
 * Middleware to verify authentication (optional)
 */
function verifyAuth(req, res, next) {
  // This middleware doesn't redirect, just sets req.user if authenticated
  if (req.isAuthenticated()) {
    console.log(`[Auth] User ${req.user.username} verified`);
  } else {
    console.log(`[Auth] No authenticated user found`);
  }
  next();
}

/**
 * Middleware to verify guild access
 */
function verifyGuildAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const guildId = req.params.guildId;
  if (!guildId) {
    return res.status(400).json({
      success: false,
      error: 'Guild ID required'
    });
  }

  // Check if user has access to this guild
  const userGuild = req.user.guilds?.find(guild => guild.id === guildId);
  if (!userGuild) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this guild'
    });
  }

  // Check if user has administrator permissions
  const hasAdminPerms = (userGuild.permissions & 0x8) === 0x8; // Administrator permission
  if (!hasAdminPerms) {
    return res.status(403).json({
      success: false,
      error: 'Administrator permissions required'
    });
  }

  next();
}

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions() {
  try {
    const result = await UserSession.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    if (result.deletedCount > 0) {
      console.log(`[Auth] Cleaned up ${result.deletedCount} expired sessions`);
    }
  } catch (error) {
    console.error('[Auth] Error cleaning up expired sessions:', error);
  }
}

module.exports = {
  configurePassport,
  requireAuth,
  verifyAuth,
  verifyGuildAccess,
  cleanupExpiredSessions
};