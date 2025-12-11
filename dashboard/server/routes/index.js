const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', {
    title: 'Anna Manager Bot Dashboard'
  });
});

module.exports = router;
