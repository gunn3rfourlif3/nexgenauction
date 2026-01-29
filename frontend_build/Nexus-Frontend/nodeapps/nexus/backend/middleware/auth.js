const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Dev-mode fallback: if DB is not forced, trust decoded payload as user
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      const payloadUser = decoded || {};
      const isActive = typeof payloadUser.isActive === 'undefined' ? true : !!payloadUser.isActive;
      if (!isActive) {
        return res.status(401).json({ success: false, message: 'Account is deactivated.' });
      }
      req.user = payloadUser;
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token. User not found.' 
      });
    }
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated.' 
      });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired.' 
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during authentication.' 
    });
  }
};

// Middleware to check if user is admin (or super)
const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super')) {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin privileges required.' 
    });
  }
};

// Middleware to check if user is super
const requireSuper = (req, res, next) => {
  if (req.user && req.user.role === 'super') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Super privileges required.'
    });
  }
};

// Middleware to check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.resource?.[resourceUserField] || req.params.userId;
    
    if (resourceUserId && resourceUserId.toString() === req.user._id.toString()) {
      return next();
    }

    res.status(403).json({ 
      success: false,
      message: 'Access denied. You can only access your own resources.' 
    });
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
        (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
      if (devFallbackEnabled) {
        const isActive = typeof decoded.isActive === 'undefined' ? true : !!decoded.isActive;
        if (isActive) req.user = decoded;
      } else {
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  authenticateToken: authenticate, // Alias for backward compatibility
  requireAdmin,
  requireRole: requireAdmin, // Alias for backward compatibility
  requireOwnershipOrAdmin,
  optionalAuth,
  requireSuper
};