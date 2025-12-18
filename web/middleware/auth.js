const passport = require('passport');
const DiscordStrategy = require('discord-strategy');
const UserSession = require('../../schemas/UserSession');

/**
 * Fetch user's guilds from Discord API
 * @param {string} accessToken - Discord OAuth2 access token
 * @returns {Promise<Array>} Array of guild objects
 */
async function fetchUserGuilds(accessToken) {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[Auth] Failed to fetch guilds:', response.status, response.statusText);
      return [];
    }

    const guilds = await response.json();
    console.log(`[Auth] Fetched ${guilds.length} guilds from Discord API`);
    return guilds;
  } catch (error) {
    console.error('[Auth] Error fetching guilds:', error);
    return [];
  }
}

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
      // Fetch user's guilds from Discord API (not included in profile by default)
      const guilds = await fetchUserGuilds(accessToken);
      
      console.log(`[Auth] User ${profile.username} authenticated with ${guilds.length} guilds`);
      
      // Create or update user session
      const sessionData = {
        userId: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        guilds: guilds,
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
  // Discord sends permissions as string for large numbers, so we use BigInt
  const hasAccess = req.user.guilds.some(guild => {
    if (guild.id !== guildId) return false;
    
    // Owner always has access
    if (guild.owner) return true;
    
    // Convert permissions to BigInt for accurate bitwise operations
    const permissions = BigInt(guild.permissions || 0);
    const ADMINISTRATOR = BigInt(0x8);
    
    return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
  });

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