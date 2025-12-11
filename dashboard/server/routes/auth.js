const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: '/?error=unauthorized' 
  }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.redirect('/dashboard');
    }
    res.redirect('/');
  });
});

module.exports = router;
