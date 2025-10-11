const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');

// Dev-mode in-memory store for mock users and permissions
// Used only when ENABLE_DEV_MOCK or development without FORCE_DB_CONNECTION
const devMockState = {
  initialized: false,
  users: {}
};

const initDevMockUsers = (adminEmail) => {
  const nowIso = new Date().toISOString();
  devMockState.users = {
    '000000000000000000000001': {
      _id: '000000000000000000000001',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail || 'admin@nexusauctions.com',
      role: 'admin',
      isActive: true,
      createdAt: nowIso,
      permissions: { canSell: true, canBid: true, canModerate: true }
    },
    '000000000000000000000002': {
      _id: '000000000000000000000002',
      username: 'dev',
      firstName: 'Dev',
      lastName: 'User',
      email: 'dev@example.com',
      role: 'user',
      isActive: true,
      createdAt: nowIso,
      permissions: { canSell: true, canBid: true, canModerate: false }
    },
    '000000000000000000000003': {
      _id: '000000000000000000000003',
      username: 'seller',
      firstName: 'Sample',
      lastName: 'Seller',
      email: 'seller@example.com',
      role: 'user',
      isActive: true,
      createdAt: nowIso,
      permissions: { canSell: true, canBid: true, canModerate: false }
    }
  };
  devMockState.initialized = true;
};

// Generate JWT token (supports optional payload extras in dev)
const generateToken = (userId, extras = {}) => {
  const payload = { id: userId, ...extras };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Register new user
const register = async (req, res) => {
  try {

    const { username, email, password, firstName, lastName, phone, dateOfBirth } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'User with this email already exists' 
          : 'Username is already taken'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth
    });

    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    
    await user.save();

    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(
      user.email, 
      verificationToken, 
      user.firstName
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Continue with registration even if email fails
    }

    // Generate token (but user won't be fully authenticated until verified)
    const token = generateToken(user._id);

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: userResponse,
        token,
        emailSent: emailResult.success
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    // Dev-mode auth fallback: when enabled, bypass DB and issue a mock token/user
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      try {
        const nowIso = new Date().toISOString();
        const localPart = (email && email.split('@')[0]) || 'devuser';
        const isAdmin = ((email || '').toLowerCase() === 'admin@nexusauctions.com');
        const devUser = {
          _id: isAdmin ? '000000000000000000000001' : '000000000000000000000002',
          username: localPart,
          firstName: isAdmin ? 'Admin' : 'Dev',
          lastName: 'User',
          email: email || (isAdmin ? 'admin@nexusauctions.com' : 'dev@example.com'),
          role: isAdmin ? 'admin' : 'user',
          isActive: true,
          createdAt: nowIso,
          lastLogin: nowIso
        };
        const token = generateToken(devUser._id, devUser);
        return res.json({
          success: true,
          message: 'Login successful (dev mode)',
          data: {
            user: devUser,
            token
          }
        });
      } catch (e) {
        // If dev fallback fails, proceed with DB login
        console.warn('Dev login fallback failed; attempting DB login:', e.message);
      }
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    // Dev-mode: serve profile from token payload/user set by middleware
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ success: false, message: 'Access denied. No user context.' });
        }
        return res.json({ success: true, data: { user } });
      } catch (e) {
        console.warn('Dev profile fallback failed; attempting DB lookup:', e.message);
      }
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    console.error('Env details -> NODE_ENV:', process.env.NODE_ENV, 'FORCE_DB_CONNECTION:', process.env.FORCE_DB_CONNECTION);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      address,
      profileImage 
    } = req.body;
    const userId = req.user.id;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
    }

    // Prepare update object
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    
    // Handle address update
    if (address) {
      updateData.address = {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
        country: address.country || ''
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Find user with the verification token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Mark user as verified and clear verification token
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully! You can now access all features.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.firstName
    );

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    // Find user with the reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully! You can now login with your new password.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    // Dev-mode fallback: when DB is disabled, return an in-memory mock list
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Initialize dev mock users once with permissions
      if (!devMockState.initialized) {
        const adminEmail = (req.user && req.user.email) || 'admin@nexusauctions.com';
        initDevMockUsers(adminEmail);
      }
      const mockUsers = Object.values(devMockState.users);

      // Apply search filter
      const filtered = search
        ? mockUsers.filter(u => {
            const q = String(search).toLowerCase();
            return (
              (u.username || '').toLowerCase().includes(q) ||
              (u.email || '').toLowerCase().includes(q) ||
              (u.firstName || '').toLowerCase().includes(q) ||
              (u.lastName || '').toLowerCase().includes(q)
            );
          })
        : mockUsers;

      // Apply sort
      const dir = sortOrder === 'desc' ? -1 : 1;
      const sorted = filtered.slice().sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      });

      // Pagination
      const p = parseInt(page);
      const l = parseInt(limit);
      const start = (p - 1) * l;
      const end = start + l;
      const pageItems = sorted.slice(start, end);
      const totalUsers = sorted.length;
      const totalPages = Math.ceil(totalUsers / l);

      return res.json({
        success: true,
        data: {
          users: pageItems,
          pagination: {
            currentPage: p,
            totalPages,
            totalUsers,
            hasNextPage: p < totalPages,
            hasPrevPage: p > 1
          }
        }
      });
    }

    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get users with pagination
    const users = await User.find(searchQuery)
      .select('-password -verificationToken -resetPasswordToken')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// Promote a user to admin (super-only)
const promoteToAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      const userObj = user.toObject();
      delete userObj.password;
      return res.json({
        success: true,
        message: 'User is already an admin',
        data: { user: userObj }
      });
    }

    user.role = 'admin';
    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    return res.json({
      success: true,
      message: 'User promoted to admin successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Promote to admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during promotion'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getAllUsers,
  promoteToAdmin,
  // Update user role (super-only)
  updateUserRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body || {};

      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
      if (!['user', 'admin', 'super'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role provided' });
      }

      const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
        (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
      if (devFallbackEnabled) {
        const nowIso = new Date().toISOString();
        return res.json({
          success: true,
          message: 'User role updated (development simulation)',
          data: {
            user: {
              _id: String(userId || '000000000000000000000001'),
              username: 'dev-user',
              email: 'dev@example.com',
              role,
              isActive: true,
              createdAt: nowIso,
              permissions: { canSell: true, canBid: true, canModerate: role !== 'user' }
            }
          }
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.role = role;
      await user.save();

      const userObj = user.toObject();
      delete userObj.password;
      return res.json({ success: true, message: 'User role updated successfully', data: { user: userObj } });
    } catch (error) {
      console.error('Update user role error:', error);
      return res.status(500).json({ success: false, message: 'Server error while updating user role' });
    }
  },
  // Update user granular permissions (admin or super)
  updateUserPermissions: async (req, res) => {
    try {
      const { userId } = req.params;
      const { permissions } = req.body || {};

      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ success: false, message: 'Invalid permissions payload' });
      }

      const allowedKeys = ['canSell', 'canBid', 'canModerate'];
      const updatePermissions = {};
      for (const key of allowedKeys) {
        if (permissions.hasOwnProperty(key)) {
          const val = permissions[key];
          if (typeof val !== 'boolean') {
            return res.status(400).json({ success: false, message: `Permission ${key} must be a boolean` });
          }
          updatePermissions[key] = val;
        }
      }

      const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
        (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
      if (devFallbackEnabled) {
        // Ensure dev store initialized
        if (!devMockState.initialized) {
          const adminEmail = (req.user && req.user.email) || 'admin@nexusauctions.com';
          initDevMockUsers(adminEmail);
        }
        const id = String(userId);
        const existing = devMockState.users[id];
        if (!existing) {
          return res.status(404).json({ success: false, message: 'User not found (dev)' });
        }
        const newPerms = Object.assign({}, existing.permissions || {}, updatePermissions);
        devMockState.users[id] = { ...existing, permissions: newPerms };
        return res.json({ success: true, message: 'User permissions updated (dev)', data: { user: devMockState.users[id] } });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.permissions = Object.assign({}, user.permissions?.toObject?.() || user.permissions || {}, updatePermissions);
      await user.save();

      const userObj = user.toObject();
      delete userObj.password;
      return res.json({ success: true, message: 'User permissions updated successfully', data: { user: userObj } });
    } catch (error) {
      console.error('Update user permissions error:', error);
      return res.status(500).json({ success: false, message: 'Server error while updating user permissions' });
    }
  },
  // Update user active status (admin only)
  updateUserStatus: async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body || {};

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Invalid payload: isActive must be a boolean'
        });
      }

      const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
        (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');

      if (devFallbackEnabled) {
        // Simulate success in dev without DB
        return res.json({
          success: true,
          message: 'User status updated (development simulation)',
          data: {
            user: {
              _id: String(userId || '000000000000000000000001'),
              username: 'dev-user',
              email: 'dev@example.com',
              role: 'user',
              isActive
            }
          }
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.isActive = isActive;
      await user.save();

      const userObj = user.toObject();
      delete userObj.password;

      return res.json({
        success: true,
        message: 'User status updated successfully',
        data: { user: userObj }
      });
    } catch (error) {
      console.error('Update user status error:', error);
      return res.status(500).json({ success: false, message: 'Server error while updating user status' });
    }
  }
};