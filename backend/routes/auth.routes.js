const express = require('express');
const passport = require('../config/passport');
const { register, login } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  // After successful auth, redirect to frontend with token
  res.redirect(`http://localhost:5500/Main/index.html?token=${req.user.token}`);
});

module.exports = router;