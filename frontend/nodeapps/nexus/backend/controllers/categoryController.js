const Category = require('../models/Category');

// Get all categories
const getCategories = async (req, res) => {
  try {
    const { includeInactive = false, parentOnly = false } = req.query;

    const filter = {};
    if (!includeInactive || includeInactive === 'false') {
      filter.isActive = true;
    }
    if (parentOnly === 'true') {
      filter.parentCategory = null;
    }

    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug')
      .populate('subcategories', 'name slug description icon')
      .sort('sortOrder name');

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

// Get category by ID or slug
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug
    let category = await Category.findById(id)
      .populate('parentCategory', 'name slug')
      .populate('subcategories', 'name slug description icon');

    if (!category) {
      category = await Category.findOne({ slug: id })
        .populate('parentCategory', 'name slug')
        .populate('subcategories', 'name slug description icon');
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category'
    });
  }
};

// Create new category (Admin only)
const createCategory = async (req, res) => {
  try {
    const categoryData = req.body;

    // Check if parent category exists (if provided)
    if (categoryData.parentCategory) {
      const parentExists = await Category.findById(categoryData.parentCategory);
      if (!parentExists) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    const category = new Category(categoryData);
    await category.save();

    // Update parent category's subcategories if applicable
    if (category.parentCategory) {
      await Category.findByIdAndUpdate(
        category.parentCategory,
        { $push: { subcategories: category._id } }
      );
    }

    await category.populate('parentCategory', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name or slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating category'
    });
  }
};

// Update category (Admin only)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if parent category exists (if being updated)
    if (updates.parentCategory && updates.parentCategory !== null) {
      const parentExists = await Category.findById(updates.parentCategory);
      if (!parentExists) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }

      // Prevent circular references
      if (updates.parentCategory === id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent'
        });
      }
    }

    const category = await Category.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('parentCategory', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name or slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating category'
    });
  }
};

// Delete category (Admin only)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Delete subcategories first.'
      });
    }

    // TODO: Check if category has active auctions
    // const auctionCount = await Auction.countDocuments({ category: category.slug });
    // if (auctionCount > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Cannot delete category with active auctions'
    //   });
    // }

    // Remove from parent category's subcategories
    if (category.parentCategory) {
      await Category.findByIdAndUpdate(
        category.parentCategory,
        { $pull: { subcategories: category._id } }
      );
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting category'
    });
  }
};

// Get category tree structure
const getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('subcategories', 'name slug description icon')
      .sort('sortOrder name');

    // Build tree structure
    const tree = categories.filter(cat => !cat.parentCategory);

    res.json({
      success: true,
      data: { categoryTree: tree }
    });
  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category tree'
    });
  }
};

// Toggle category active status (Admin only)
const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    category.isActive = !category.isActive;
    await category.save();

    res.json({
      success: true,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { category }
    });
  } catch (error) {
    console.error('Toggle category status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling category status'
    });
  }
};

// Reorder categories (Admin only)
const reorderCategories = async (req, res) => {
  try {
    const { categoryOrders } = req.body; // Array of { id, sortOrder }

    if (!Array.isArray(categoryOrders)) {
      return res.status(400).json({
        success: false,
        message: 'categoryOrders must be an array'
      });
    }

    // Update sort orders
    const updatePromises = categoryOrders.map(({ id, sortOrder }) =>
      Category.findByIdAndUpdate(id, { sortOrder })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reordering categories'
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  toggleCategoryStatus,
  reorderCategories
};