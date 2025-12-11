module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/auth/discord');
  },

  ensureAdmin: (req, res, next) => {
    if (req.isAuthenticated()) {
      const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
      if (adminIds.includes(req.user.id)) {
        return next();
      }
    }
    res.status(403).render('error', {
      title: 'Forbidden',
      error: { message: 'You do not have permission to access this page.' }
    });
  }
};
