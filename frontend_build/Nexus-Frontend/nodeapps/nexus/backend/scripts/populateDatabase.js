const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Category = require('../models/Category');
const Auction = require('../models/Auction');

// Connect to MongoDB with increased timeout
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample categories
const categories = [
  { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets' },
  { name: 'Art', slug: 'art', description: 'Paintings, sculptures, and artwork' },
  { name: 'Jewelry', slug: 'jewelry', description: 'Fine jewelry and accessories' },
  { name: 'Vehicles', slug: 'vehicles', description: 'Cars, motorcycles, and other vehicles' },
  { name: 'Home', slug: 'home', description: 'Home decor and furniture' },
  { name: 'Fashion', slug: 'fashion', description: 'Clothing and fashion accessories' },
  { name: 'Collectibles', slug: 'collectibles', description: 'Rare and collectible items' },
  { name: 'Antiques', slug: 'antiques', description: 'Vintage and antique items' },
  { name: 'Books', slug: 'books', description: 'Books and literature' },
  { name: 'Sports', slug: 'sports', description: 'Sports equipment and memorabilia' },
  { name: 'Music', slug: 'music', description: 'Musical instruments and equipment' },
  { name: 'Other', slug: 'other', description: 'Miscellaneous items' }
];

// Sample users (sellers)
const users = [
  {
    username: 'admin',
    email: 'admin@nexgenauction.com',
    password: '$2b$10$rOvHPxfuqjNpPh7VtrouxeChFXfBcPxLiRMhEh6vn5g8qb.cg5jSe', // password: "password123"
    firstName: 'Admin',
    lastName: 'User',
    isVerified: true,
    role: 'admin'
  },
  {
    username: 'artdealer123',
    email: 'artdealer@example.com',
    password: '$2b$10$rOvHPxfuqjNpPh7VtrouxeChFXfBcPxLiRMhEh6vn5g8qb.cg5jSe', // password: "password123"
    firstName: 'Alexander',
    lastName: 'Smith',
    isVerified: true,
    role: 'user'
  },
  {
    username: 'vintagemaster',
    email: 'vintage@example.com',
    password: '$2b$10$rOvHPxfuqjNpPh7VtrouxeChFXfBcPxLiRMhEh6vn5g8qb.cg5jSe',
    firstName: 'Victoria',
    lastName: 'Johnson',
    isVerified: true,
    role: 'user'
  },
  {
    username: 'techguru2024',
    email: 'techguru@example.com',
    password: '$2b$10$rOvHPxfuqjNpPh7VtrouxeChFXfBcPxLiRMhEh6vn5g8qb.cg5jSe',
    firstName: 'Michael',
    lastName: 'Chen',
    isVerified: true,
    role: 'user'
  },
  {
    username: 'jewelryexpert',
    email: 'jewelry@example.com',
    password: '$2b$10$rOvHPxfuqjNpPh7VtrouxeChFXfBcPxLiRMhEh6vn5g8qb.cg5jSe',
    firstName: 'Sarah',
    lastName: 'Williams',
    isVerified: true,
    role: 'user'
  },
  {
    username: 'carCollector',
    email: 'cars@example.com',
    password: '$2b$10$rOvHPxfuqjNpPh7VtrouxeChFXfBcPxLiRMhEh6vn5g8qb.cg5jSe',
    firstName: 'Robert',
    lastName: 'Davis',
    isVerified: true,
    role: 'user'
  }
];

// Helper function to generate random start time (within next 24 hours)
const generateStartTime = () => {
  const now = new Date();
  const randomHours = Math.random() * 24; // 0-24 hours from now
  return new Date(now.getTime() + randomHours * 60 * 60 * 1000);
};

// Helper function to generate end time (1-6 days after start time)
const generateEndTime = (daysFromStart = null) => {
  const days = daysFromStart || (Math.random() * 5 + 1); // 1-6 days if not specified
  return (startTime) => new Date(startTime.getTime() + days * 24 * 60 * 60 * 1000);
};

// Sample auctions data
const generateAuctions = (users) => {
  const auctionTemplates = [
    {
      title: 'Vintage Rolex Submariner Watch',
      description: 'Authentic vintage Rolex Submariner in excellent condition. Comes with original box and papers.',
      category: 'jewelry',
      condition: 'good',
      startingPrice: 5000,
      reservePrice: 7500,
      bidIncrement: 100,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=Rolex+Watch', alt: 'Rolex Submariner', isPrimary: true }
      ],
      tags: ['rolex', 'watch', 'luxury', 'vintage']
    },
    {
      title: 'Original Oil Painting - Mountain Landscape',
      description: 'Beautiful original oil painting depicting a serene mountain landscape. Painted by renowned artist.',
      category: 'art',
      condition: 'good',
      startingPrice: 800,
      reservePrice: 1200,
      bidIncrement: 50,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=Mountain+Painting', alt: 'Mountain Landscape Painting', isPrimary: true }
      ],
      tags: ['painting', 'art', 'landscape', 'original']
    },
    {
      title: 'MacBook Pro 16-inch M2 Max',
      description: 'Latest MacBook Pro with M2 Max chip, 32GB RAM, 1TB SSD. Perfect for professional work.',
      category: 'electronics',
      condition: 'like-new',
      startingPrice: 2500,
      reservePrice: 3000,
      bidIncrement: 50,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=MacBook+Pro', alt: 'MacBook Pro', isPrimary: true }
      ],
      tags: ['macbook', 'laptop', 'apple', 'professional']
    },
    {
      title: 'Antique Victorian Dining Set',
      description: 'Exquisite Victorian dining set with table and 6 chairs. Solid mahogany construction.',
      category: 'antiques',
      condition: 'good',
      startingPrice: 1500,
      reservePrice: 2200,
      bidIncrement: 75,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=Victorian+Dining+Set', alt: 'Victorian Dining Set', isPrimary: true }
      ],
      tags: ['antique', 'furniture', 'victorian', 'dining']
    },
    {
      title: 'Rare Baseball Card Collection',
      description: 'Collection of rare baseball cards from the 1950s-1960s including Mickey Mantle rookie card.',
      category: 'collectibles',
      condition: 'fair',
      startingPrice: 3000,
      reservePrice: 4500,
      bidIncrement: 100,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=Baseball+Cards', alt: 'Baseball Card Collection', isPrimary: true }
      ],
      tags: ['baseball', 'cards', 'collectible', 'vintage']
    },
    {
      title: 'Designer Handbag - Louis Vuitton',
      description: 'Authentic Louis Vuitton handbag in excellent condition. Comes with authenticity certificate.',
      category: 'fashion',
      condition: 'like-new',
      startingPrice: 800,
      reservePrice: 1200,
      bidIncrement: 25,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=LV+Handbag', alt: 'Louis Vuitton Handbag', isPrimary: true }
      ],
      tags: ['handbag', 'luxury', 'fashion', 'designer']
    },
    {
      title: 'Fender Stratocaster Electric Guitar',
      description: 'Classic Fender Stratocaster in sunburst finish. Great for both beginners and professionals.',
      category: 'music',
      condition: 'good',
      startingPrice: 600,
      reservePrice: 900,
      bidIncrement: 25,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=Fender+Guitar', alt: 'Fender Stratocaster', isPrimary: true }
      ],
      tags: ['guitar', 'fender', 'music', 'electric']
    },
    {
      title: 'First Edition Harry Potter Book Set',
      description: 'Complete set of first edition Harry Potter books in excellent condition.',
      category: 'books',
      condition: 'good',
      startingPrice: 2000,
      reservePrice: 3000,
      bidIncrement: 50,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=Harry+Potter+Books', alt: 'Harry Potter First Editions', isPrimary: true }
      ],
      tags: ['books', 'harry potter', 'first edition', 'collectible']
    },
    {
      title: 'Professional Tennis Racket Set',
      description: 'Set of professional tennis rackets used by tournament players. Excellent condition.',
      category: 'sports',
      condition: 'good',
      startingPrice: 300,
      reservePrice: 450,
      bidIncrement: 15,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=Tennis+Rackets', alt: 'Tennis Racket Set', isPrimary: true }
      ],
      tags: ['tennis', 'sports', 'racket', 'professional']
    },
    {
      title: 'Modern Living Room Sofa Set',
      description: 'Contemporary 3-piece sofa set in premium leather. Perfect for modern homes.',
      category: 'home',
      condition: 'like-new',
      startingPrice: 1200,
      reservePrice: 1800,
      bidIncrement: 50,
      images: [
        { url: 'https://via.placeholder.com/400x300?text=Sofa+Set', alt: 'Modern Sofa Set', isPrimary: true }
      ],
      tags: ['sofa', 'furniture', 'modern', 'leather']
    }
  ];

  return auctionTemplates.map((template, index) => {
    const startTime = generateStartTime();
    const endTime = new Date(startTime.getTime() + (Math.random() * 5 + 1) * 24 * 60 * 60 * 1000); // 1-6 days after start
    
    return {
      ...template,
      seller: users[index % users.length]._id,
      startTime,
      endTime,
      status: 'active'
    };
  });
};

// Main population function
const populateDatabase = async () => {
  try {
    console.log('Starting database population...');

    // Connect to database first
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Auction.deleteMany({});

    // Create categories
    console.log('Creating categories...');
    const createdCategories = await Category.insertMany(categories);
    const categoryIds = createdCategories.map(cat => cat._id);
    console.log(`Created ${createdCategories.length} categories`);

    // Create users
    console.log('Creating users...');
    const createdUsers = await User.insertMany(users);
    const userIds = createdUsers.map(user => user._id);
    console.log(`Created ${createdUsers.length} users`);

    // Create auctions
    console.log('Creating auctions...');
    const auctionData = generateAuctions(createdUsers);
    const createdAuctions = await Auction.insertMany(auctionData);
    console.log(`Created ${createdAuctions.length} auctions`);

    console.log('\n=== Database Population Complete ===');
    console.log(`Categories: ${createdCategories.length}`);
    console.log(`Users: ${createdUsers.length}`);
    console.log(`Auctions: ${createdAuctions.length}`);
    console.log('\nSample login credentials:');
    console.log('Email: artdealer@example.com | Password: password123');
    console.log('Email: vintage@example.com | Password: password123');
    console.log('Email: techguru@example.com | Password: password123');

  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the population script
populateDatabase();