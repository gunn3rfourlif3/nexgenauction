const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Auction = require('../models/Auction');

const connectDB = async () => {
  try {
    const uri = (process.env.MONGODB_URI && process.env.MONGODB_URI.trim())
      ? process.env.MONGODB_URI.trim()
      : '';
    if (!uri) {
      throw new Error('MONGODB_URI is required. Set it in environment before running this script.');
    }

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

const pickSeller = async () => {
  // Prefer a non-admin verified user; fallback to any user
  let seller = await User.findOne({ role: { $ne: 'admin' }, isVerified: true });
  if (!seller) seller = await User.findOne({ isVerified: true });
  if (!seller) seller = await User.findOne();
  return seller;
};

const ensureSeller = async () => {
  const existing = await pickSeller();
  if (existing) return existing;

  const ts = Date.now();
  const newSeller = new User({
    username: `devseller_${ts}`,
    email: `devseller.${ts}@example.com`,
    password: 'Password123!',
    firstName: 'Dev',
    lastName: 'Seller',
    role: 'user',
    isVerified: true,
  });
  await newSeller.save();
  return newSeller;
};

const nowPlusHours = (hours) => {
  const now = new Date();
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
};

const buildAuctions = (sellerId) => {
  const startTime = nowPlusHours(0.5); // start soon (passes validation: future)
  const auctions = [
    {
      title: 'Limited Edition Gaming Console',
      description: 'Next-gen console, unopened box. Includes warranty and accessories.',
      category: 'electronics',
      condition: 'like-new',
      startingPrice: 400,
      reservePrice: 550,
      bidIncrement: 10,
      images: [{ url: 'https://via.placeholder.com/400x300?text=Console', isPrimary: true }],
      tags: ['console', 'gaming', 'limited'],
      seller: sellerId,
      startTime,
      endTime: new Date(startTime.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      title: 'Modern Abstract Art Piece',
      description: 'Original abstract painting with certificate of authenticity.',
      category: 'art',
      condition: 'good',
      startingPrice: 800,
      reservePrice: 1200,
      bidIncrement: 50,
      images: [{ url: 'https://via.placeholder.com/400x300?text=Abstract+Art', isPrimary: true }],
      tags: ['art', 'abstract', 'original'],
      seller: sellerId,
      startTime,
      endTime: new Date(startTime.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      title: 'Vintage Camera Collection',
      description: 'Assorted vintage cameras in working condition, collectors set.',
      category: 'collectibles',
      condition: 'fair',
      startingPrice: 300,
      reservePrice: 500,
      bidIncrement: 20,
      images: [{ url: 'https://via.placeholder.com/400x300?text=Vintage+Cameras', isPrimary: true }],
      tags: ['camera', 'vintage', 'collection'],
      seller: sellerId,
      startTime,
      endTime: new Date(startTime.getTime() + 4 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      title: 'Premium Leather Sofa',
      description: 'Three-seater leather sofa in excellent condition, minimal wear.',
      category: 'home',
      condition: 'good',
      startingPrice: 700,
      reservePrice: 1000,
      bidIncrement: 25,
      images: [{ url: 'https://via.placeholder.com/400x300?text=Leather+Sofa', isPrimary: true }],
      tags: ['sofa', 'leather', 'home'],
      seller: sellerId,
      startTime,
      endTime: new Date(startTime.getTime() + 6 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      title: 'Collector’s Edition Guitar',
      description: 'Limited run electric guitar, pristine condition, great tone.',
      category: 'music',
      condition: 'like-new',
      startingPrice: 950,
      reservePrice: 1300,
      bidIncrement: 50,
      images: [{ url: 'https://via.placeholder.com/400x300?text=Collector+Guitar', isPrimary: true }],
      tags: ['guitar', 'collector', 'music'],
      seller: sellerId,
      startTime,
      endTime: new Date(startTime.getTime() + 2 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
  ];
  return auctions;
};

const main = async () => {
  try {
    await connectDB();
    const seller = await ensureSeller();
    console.log('Using seller:', seller.username, seller._id.toString());

    const auctions = buildAuctions(seller._id);
    const result = await Auction.insertMany(auctions);
    console.log(`Inserted ${result.length} active auctions.`);
    result.forEach(a => console.log(`- ${a.title} (${a._id})`));
  } catch (err) {
    console.error('Error creating auctions:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

main();
