const DiscordStrategy = require('passport-discord').Strategy;

module.exports = (passport) => {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds']
  },
  (accessToken, refreshToken, profile, done) => {
    // Check if user is admin
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
    
    if (!adminIds.includes(profile.id)) {
      return done(null, false, { message: 'Unauthorized' });
    }

    profile.accessToken = accessToken;
    return done(null, profile);
  }));
};
