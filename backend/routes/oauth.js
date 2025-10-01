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

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/oauth/failure' }),
  oauthSuccess
);

// Facebook OAuth routes
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/api/auth/oauth/failure' }),
  oauthSuccess
);

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/api/auth/oauth/failure' }),
  oauthSuccess
);

// OAuth failure route
router.get('/failure', oauthFailure);

// Protected routes for linking/unlinking accounts
router.use(authenticate);

// Link OAuth account to existing user
router.post('/link/:provider', linkAccount);

// Unlink OAuth account
router.delete('/unlink/:provider', unlinkAccount);

module.exports = router;