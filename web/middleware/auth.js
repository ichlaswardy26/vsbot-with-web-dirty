const passport = require('passport');
const DiscordStrategy = require('discord-strategy');
const UserSession = require('../../schemas/UserSession');

/**
 * Configure Discord OAuth2 strategy
 */
function configurePassport() {
  const config = require('../../config');
  
  passport.use(new DiscordStrategy({
    clientID: config.clientId,
    clientSecret: config.web?.discordClientSecret || process.env.DISCORD_CLIENT_SECRET,
    callbackURL: config.web?.discordCallbackUrl || '/auth/discord/callback',
    scope: ['identify', 'guilds']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Create or update user session
      const sessionData = {
        userId: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        guilds: profile.guilds || [],
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date()
      };

      const userSession = await UserSession.findOneAndUpdate(
        { userId: profile.id },
        sessionData,
        { upsert: true, new: true }
      );

      return done(null, userSession);
    } catch (error) {
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.userId);
  });

  passport.deserializeUser(async (userId, done) => {
    try {
      const userSession = await UserSession.findOne({ userId });
      done(null, userSession);
    } catch (error) {
      done(error, null);
    }
  });
}

/**
 * Middleware to verify user authentication
 */
function verifyAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      redirectUrl: '/auth/discord'
    });
  }

  // Check if session is expired
  if (req.user.expiresAt && new Date() > req.user.expiresAt) {
    return res.status(401).json({
      success: false,
      error: 'Session expired',
      redirectUrl: '/auth/discord'
    });
  }

  next();
}

/**
 * Middleware to verify guild access permissions
 */
function verifyGuildAccess(req, res, next) {
  const { guildId } = req.params;
  
  if (!guildId) {
    return res.status(400).json({
      success: false,
      error: 'Guild ID required'
    });
  }

  // Check if user has access to this guild
  const hasAccess = req.user.guilds.some(guild => 
    guild.id === guildId && 
    (guild.permissions & 0x8) === 0x8 // Administrator permission
  );

  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions for this server',
      message: 'You need Administrator permissions to manage bot configuration'
    });
  }

  next();
}

/**
 * Middleware to handle authentication redirects for web pages
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/auth/discord');
  }

  // Check if session is expired
  if (req.user.expiresAt && new Date() > req.user.expiresAt) {
    return res.redirect('/auth/discord');
  }

  next();
}

/**
 * Session cleanup utility
 */
async function cleanupExpiredSessions() {
  try {
    const result = await UserSession.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    console.log(`Cleaned up ${result.deletedCount} expired sessions`);
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
}

module.exports = {
  configurePassport,
  verifyAuth,
  verifyGuildAccess,
  requireAuth,
  cleanupExpiredSessions
};