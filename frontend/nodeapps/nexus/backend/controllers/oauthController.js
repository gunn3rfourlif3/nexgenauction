const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// OAuth success callback
const oauthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
    }

    // Update last login
    req.user.lastLogin = new Date();
    await req.user.save();

    // Generate JWT token
    const token = generateToken(req.user._id);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('OAuth success error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

// OAuth failure callback
const oauthFailure = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
};

// Link OAuth account to existing user
const linkAccount = async (req, res) => {
  try {
    const { provider } = req.params;
    const user = req.user; // From authentication middleware

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Store user ID in session for OAuth linking
    req.session.linkUserId = user._id;
    req.session.linkProvider = provider;

    // Redirect to OAuth provider
    const redirectUrls = {
      google: '/api/auth/google',
      facebook: '/api/auth/facebook',
      github: '/api/auth/github'
    };

    if (!redirectUrls[provider]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OAuth provider'
      });
    }

    res.redirect(redirectUrls[provider]);
  } catch (error) {
    console.error('Link account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Unlink OAuth account
const unlinkAccount = async (req, res) => {
  try {
    const { provider } = req.params;
    const user = req.user; // From authentication middleware

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user has a password or other OAuth accounts
    const hasPassword = user.password;
    const hasOtherOAuth = (provider !== 'google' && user.googleId) ||
                         (provider !== 'facebook' && user.facebookId) ||
                         (provider !== 'github' && user.githubId);

    if (!hasPassword && !hasOtherOAuth) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unlink the only authentication method. Please set a password first.'
      });
    }

    // Remove OAuth provider ID
    const providerFields = {
      google: 'googleId',
      facebook: 'facebookId',
      github: 'githubId'
    };

    if (!providerFields[provider]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OAuth provider'
      });
    }

    user[providerFields[provider]] = undefined;
    await user.save();

    res.json({
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked successfully`
    });
  } catch (error) {
    console.error('Unlink account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  oauthSuccess,
  oauthFailure,
  linkAccount,
  unlinkAccount
};