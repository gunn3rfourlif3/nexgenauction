const express = require('express');
const passport = require('passport');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  oauthSuccess,
  oauthFailure,
  linkAccount,
  unlinkAccount
} = require('../controllers/oauthController');

// Provider configuration flags to guard routes in development
const HAS_GOOGLE = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const HAS_FACEBOOK = !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
const HAS_GITHUB = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

// Google OAuth routes
if (HAS_GOOGLE) {
  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/api/auth/oauth/failure' }),
    oauthSuccess
  );
} else {
  router.get('/google', (req, res) => {
    res.status(501).json({ success: false, message: 'Google OAuth not configured' });
  });
  router.get('/google/callback', (req, res) => {
    res.status(501).json({ success: false, message: 'Google OAuth not configured' });
  });
}

// Facebook OAuth routes
if (HAS_FACEBOOK) {
  router.get('/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );

  router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/api/auth/oauth/failure' }),
    oauthSuccess
  );
} else {
  router.get('/facebook', (req, res) => {
    res.status(501).json({ success: false, message: 'Facebook OAuth not configured' });
  });
  router.get('/facebook/callback', (req, res) => {
    res.status(501).json({ success: false, message: 'Facebook OAuth not configured' });
  });
}

// GitHub OAuth routes
if (HAS_GITHUB) {
  router.get('/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );

  router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/api/auth/oauth/failure' }),
    oauthSuccess
  );
} else {
  router.get('/github', (req, res) => {
    res.status(501).json({ success: false, message: 'GitHub OAuth not configured' });
  });
  router.get('/github/callback', (req, res) => {
    res.status(501).json({ success: false, message: 'GitHub OAuth not configured' });
  });
}

// OAuth failure route
router.get('/failure', oauthFailure);

// Protected routes for linking/unlinking accounts
router.use(authenticate);

// Link OAuth account to existing user
router.post('/link/:provider', linkAccount);

// Unlink OAuth account
router.delete('/unlink/:provider', unlinkAccount);

module.exports = router;