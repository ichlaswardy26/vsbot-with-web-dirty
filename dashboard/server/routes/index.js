const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', {
    title: 'Villain Seraphyx Manager Bot Dashboard'
  });
});

module.exports = router;
