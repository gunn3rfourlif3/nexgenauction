// Seed the 'Upcoming Auctions' category (with optional parent 'Auctions')
// Usage: node backend/scripts/seedUpcomingCategory.js
// Env: MONGODB_URI (optional)
const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');

const connectDB = async () => {
  try {
    const uri = (process.env.MONGODB_URI && process.env.MONGODB_URI.trim())
      ? process.env.MONGODB_URI.trim()
      : 'mongodb://localhost:27017/nexgenauction';

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const slugify = (name) => {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

async function ensureCategory(name, options = {}) {
  const slug = slugify(name);
  let cat = await Category.findOne({ slug });
  if (cat) {
    console.log(`Category exists: ${name} (${cat._id})`);
    return cat;
  }

  cat = new Category({
    name,
    slug, // explicitly set slug to satisfy schema requirement
    description: options.description || '',
    icon: options.icon || null,
    image: options.image || null,
    parentCategory: options.parentCategory || null,
    isActive: options.isActive !== undefined ? options.isActive : true,
    sortOrder: options.sortOrder || 0,
    metadata: {
      featured: !!options.featured,
      color: options.color || undefined,
      popularityScore: options.popularityScore || 0,
    }
  });
  await cat.save();

  // If parent provided, ensure relationship is reflected
  if (options.parentCategory) {
    await Category.findByIdAndUpdate(options.parentCategory, { $addToSet: { subcategories: cat._id } });
  }

  console.log(`Created category: ${name} (${cat._id})`);
  return cat;
}

async function main() {
  try {
    await connectDB();

    // Ensure parent 'Auctions' category
    const parent = await ensureCategory('Auctions', {
      description: 'All auction listings',
      icon: 'mdi-gavel',
      sortOrder: 1,
      featured: true,
    });

    // Ensure child 'Upcoming Auctions' under parent
    const upcoming = await ensureCategory('Upcoming Auctions', {
      description: 'Upcoming auctions starting soon',
      icon: 'mdi-clock-outline',
      sortOrder: 2,
      featured: true,
      parentCategory: parent._id,
    });

    // Double-check parent-child linkage in case parent existed
    await Category.findByIdAndUpdate(parent._id, { $addToSet: { subcategories: upcoming._id } });

    console.log('Seeding completed.');
  } catch (err) {
    console.error('Error seeding categories:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

main();