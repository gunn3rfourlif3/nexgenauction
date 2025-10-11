const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// User validation rules
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must not exceed 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must not exceed 50 characters'),
  
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Auction validation rules
const validateAuctionCreation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title is required and must not exceed 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description is required and must not exceed 2000 characters'),
  
  body('category')
    .isIn([
      'electronics', 'art', 'jewelry', 'vehicles', 'home', 'fashion', 'collectibles',
      'antiques', 'books', 'sports', 'music', 'other'
    ])
    .withMessage('Please select a valid category'),
  
  body('condition')
    .isIn(['new', 'like-new', 'good', 'fair', 'poor'])
    .withMessage('Please select a valid condition'),
  
  body('startingPrice')
    .isFloat({ min: 0 })
    .withMessage('Starting price must be a positive number'),
  
  body('reservePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Reserve price must be a positive number'),
  
  body('bidIncrement')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Bid increment must be at least 0.01'),
  
  body('startTime')
    .isISO8601()
    .withMessage('Please provide a valid start time')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  
  body('endTime')
    .isISO8601()
    .withMessage('Please provide a valid end time')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('images')
    .isArray({ min: 1 })
    .withMessage('At least one image is required'),
  
  body('images.*.url')
    .custom((value) => {
      if (typeof value !== 'string') {
        throw new Error('Please provide valid image URLs');
      }
      // Accept absolute URLs, common relative paths, and data URIs
      const isAbsolute = /^(https?:\/\/|ftp:\/\/)/i.test(value);
      // Relative paths can be root-based ("/path"), current dir ("./path"), or parent dir ("../path")
      const isRelative = /^(\/|\.\/|\.\.\/)/.test(value);
      // Data URIs: allow image mime types with optional charset; content may be base64 or URL-encoded
      const isData = /^data:image\/[a-zA-Z0-9.+-]+(;charset=[a-zA-Z0-9-]+)?(;base64)?,[A-Za-z0-9+/=._-]+/i.test(value);
      // Also accept simple placeholder endpoints commonly used in dev (e.g., /api/placeholder/400/300)
      const isDevPlaceholder = /^\/api\/placeholder\/(\d{2,4})\/(\d{2,4})(\?.*)?$/i.test(value);
      if (isAbsolute || isRelative || isData || isDevPlaceholder) {
        return true;
      }
      throw new Error('Please provide valid image URLs');
    }),
  
  handleValidationErrors
];

const validateBidPlacement = [
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Bid amount must be a positive number'),
  
  handleValidationErrors
];

// Category validation rules
const validateCategoryCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name is required and must not exceed 50 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid parent category ID'),
  
  handleValidationErrors
];

// Parameter validation
// In development mode without DB connection, allow simple numeric/string IDs for mock data
const validateObjectId = (paramName) => {
  const validators = [];

  // If running in development and not forcing DB connection, relax ID validation
  if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
    validators.push(
      param(paramName)
        .trim()
        .matches(/^[A-Za-z0-9_-]+$/)
        .withMessage(`Invalid ${paramName} format`)
    );
  } else {
    validators.push(
      param(paramName)
        .isMongoId()
        .withMessage(`Invalid ${paramName} ID format`)
    );
  }

  validators.push(handleValidationErrors);
  return validators;
};

// Query validation
const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .isIn([
      'createdAt', '-createdAt',
      'startTime', '-startTime',
      'endTime', '-endTime',
      'currentBid', '-currentBid',
      'startingPrice', '-startingPrice',
      'views', '-views',
      'bidCount', '-bidCount',
      'title', '-title'
    ])
    .withMessage('Invalid sort parameter'),
  
  handleValidationErrors
];

const validateAuctionQuery = [
  query('category')
    .optional()
    .isIn(['Art', 'Collectibles', 'Vehicles', 'Antiques', 'Jewelry', 'Books & Manuscripts'])
    .withMessage('Invalid category'),

  query('status')
    .optional()
    .isIn(['upcoming', 'active', 'paused', 'ended', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  
  ...validatePaginationQuery
];

// Validate top-up request
const validateTopUp = [
  body('amount')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Amount must be between $0.01 and $10,000'),
  
  body('paymentMethod')
    .optional()
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'development'])
    .withMessage('Invalid payment method'),
  
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),
  
  handleValidationErrors
];

// Validate withdrawal request
const validateWithdrawal = [
  body('amount')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Amount must be between $0.01 and $10,000'),
  
  body('withdrawalMethod')
    .optional()
    .isIn(['bank_transfer', 'paypal', 'development'])
    .withMessage('Invalid withdrawal method'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateAuctionCreation,
  validateBidPlacement,
  validateCategoryCreation,
  validateObjectId,
  validatePaginationQuery,
  validateAuctionQuery,
  validateTopUp,
  validateWithdrawal
};