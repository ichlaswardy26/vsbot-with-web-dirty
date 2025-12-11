// Middleware untuk autentikasi dan otorisasi

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/discord');
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/auth/discord');
  }
  
  // Check if user is admin (from environment variable)
  const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
  const ownerIds = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [];
  
  const allAdminIds = [...adminIds, ...ownerIds];
  
  if (allAdminIds.includes(req.user.id)) {
    return next();
  }
  
  res.status(403).render('error', {
    title: 'Access Denied',
    error: { message: 'You do not have permission to access this page.' }
  });
};

const requireOwner = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/auth/discord');
  }
  
  // Check if user is owner (from environment variable)
  const ownerIds = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [];
  
  if (ownerIds.includes(req.user.id)) {
    return next();
  }
  
  res.status(403).render('error', {
    title: 'Access Denied',
    error: { message: 'Only bot owners can access this page.' }
  });
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireOwner
};