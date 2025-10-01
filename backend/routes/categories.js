const express = require('express');
const router = express.Router();

// Import controllers
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  toggleCategoryStatus,
  reorderCategories
} = require('../controllers/categoryController');

// Import middleware
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  validateCategoryCreation,
  validateObjectId,
  handleValidationErrors
} = require('../middleware/validation');
const { body, query } = require('express-validator');

// Public routes
router.get('/', [
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive must be a boolean'),
  
  query('parentOnly')
    .optional()
    .isBoolean()
    .withMessage('parentOnly must be a boolean'),
  
  handleValidationErrors
], getCategories);

router.get('/tree', getCategoryTree);
router.get('/:id', getCategoryById);

// Protected routes (Admin only)
router.use(authenticate);
router.use(requireAdmin);

// Category CRUD operations
router.post('/', validateCategoryCreation, createCategory);

router.put('/:id', [
  validateObjectId('id')[0], // Get the param validation
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name must be between 1 and 50 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid parent category ID'),
  
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon must not exceed 50 characters'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Please provide a valid image URL'),
  
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  handleValidationErrors
], updateCategory);

router.delete('/:id', validateObjectId('id'), deleteCategory);

// Category management operations
router.patch('/:id/toggle-status', validateObjectId('id'), toggleCategoryStatus);

router.put('/reorder', [
  body('categoryOrders')
    .isArray({ min: 1 })
    .withMessage('categoryOrders must be a non-empty array'),
  
  body('categoryOrders.*.id')
    .isMongoId()
    .withMessage('Each category order must have a valid ID'),
  
  body('categoryOrders.*.sortOrder')
    .isInt({ min: 0 })
    .withMessage('Each category order must have a valid sort order'),
  
  handleValidationErrors
], reorderCategories);

module.exports = router;