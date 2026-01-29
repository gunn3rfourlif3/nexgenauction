const express = require('express');
const router = express.Router();

// Import controllers
const {
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
  resendVerificationEmail
} = require('../controllers/authController');

// Import middleware
const { authenticate, requireAdmin, requireSuper } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  handleValidationErrors
} = require('../middleware/validation');
const { body } = require('express-validator');
const { updateUserStatus, updateUserRole, updateUserPermissions } = require('../controllers/authController');

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);
router.post('/logout', logout);

// Email verification (placeholder)
router.get('/verify-email/:token', verifyEmail);

// Password reset (placeholder)
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
], requestPasswordReset);

router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
], resetPassword);

// Protected routes (require authentication)
router.use(authenticate);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Street address must not exceed 100 characters'),
  
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must not exceed 50 characters'),
  
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State must not exceed 50 characters'),
  
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Zip code must not exceed 20 characters'),
  
  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Country must not exceed 50 characters'),
  
  handleValidationErrors
], updateProfile);

// Resend verification email
router.post('/verify-email/resend', resendVerificationEmail);
router.get('/verify-email/resend', resendVerificationEmail);

// Change password
router.put('/change-password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
], changePassword);

// Admin routes (require admin privileges)
router.get('/users', requireAdmin, getAllUsers);
router.patch('/users/:userId/status', requireAdmin, [
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors
], updateUserStatus);

// Super-only: promote a user to admin by ID
router.patch('/users/:userId/promote', requireSuper, promoteToAdmin);

// Super-only: update a user's role directly
router.patch('/users/:userId/role', requireSuper, [
  body('role').isIn(['user', 'admin', 'super']).withMessage('Invalid role'),
  handleValidationErrors
], updateUserRole);

// Admin or super: update granular permissions
router.patch('/users/:userId/permissions', requireAdmin, [
  body('permissions').isObject().withMessage('permissions must be an object'),
  body('permissions.canSell').optional().isBoolean().withMessage('canSell must be boolean'),
  body('permissions.canBid').optional().isBoolean().withMessage('canBid must be boolean'),
  body('permissions.canModerate').optional().isBoolean().withMessage('canModerate must be boolean'),
  handleValidationErrors
], updateUserPermissions);

module.exports = router;