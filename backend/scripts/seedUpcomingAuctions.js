const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Auction = require('../models/Auction');

// Parse desired count from CLI args or env
// Supports: --count=NN, --count NN, -c NN, -n NN, env UPCOMING_COUNT or COUNT
const parseCountArg = () => {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = String(args[i]);
    if (a.startsWith('--count=')) {
      const v = parseInt(a.split('=')[1], 10);
      if (Number.isFinite(v) && v > 0) return v;
    }
    if (a === '--count' || a === '-c' || a === '-n') {
      const next = parseInt(args[i + 1], 10);
      if (Number.isFinite(next) && next > 0) return next;
    }
  }
  const envV = parseInt(process.env.UPCOMING_COUNT || process.env.COUNT, 10);
  if (Number.isFinite(envV) && envV > 0) return envV;
  return null; // use default later
};

const DEFAULT_COUNT = 6; // matches templates length
const REQUESTED_COUNT = parseCountArg();

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
    username: `seed_seller_${ts}`,
    email: `seed.seller.${ts}@example.com`,
    password: 'Password123!',
    firstName: 'Seed',
    lastName: 'Seller',
    role: 'user',
    isVerified: true,
  });
  await newSeller.save();
  return newSeller;
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const daysFromNow = (days) => {
  const now = new Date();
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
};

const buildUpcomingAuctions = (sellerId, count) => {
  const templates = [
    {
      title: 'Upcoming: Vintage Rolex Submariner 5513 - 1970',
      description: 'Authentic vintage Rolex Submariner in excellent condition. Original box and papers included.',
      category: 'jewelry',
      condition: 'good',
      startingPrice: 5000,
      reservePrice: 7500,
      bidIncrement: 100,
      imageText: 'Rolex+5513'
    },
    {
      title: 'Upcoming: Original Oil Painting - Mountain Landscape',
      description: 'Beautiful original oil painting by a renowned artist. Serene mountain landscape.',
      category: 'art',
      condition: 'good',
      startingPrice: 800,
      reservePrice: 1200,
      bidIncrement: 50,
      imageText: 'Mountain+Landscape'
    },
    {
      title: 'Upcoming: MacBook Pro 16-inch M2 Max',
      description: 'Latest MacBook Pro, M2 Max, 32GB RAM, 1TB SSD. Professional performance.',
      category: 'electronics',
      condition: 'like-new',
      startingPrice: 2500,
      reservePrice: 3000,
      bidIncrement: 50,
      imageText: 'MacBook+Pro+M2+Max'
    },
    {
      title: 'Upcoming: Antique Victorian Dining Set',
      description: 'Exquisite Victorian dining set: table and 6 chairs. Solid mahogany.',
      category: 'antiques',
      condition: 'good',
      startingPrice: 1500,
      reservePrice: 2200,
      bidIncrement: 75,
      imageText: 'Victorian+Dining+Set'
    },
    {
      title: 'Upcoming: Rare Baseball Card Collection',
      description: 'Collection of rare baseball cards from the 1950s-1960s including key rookies.',
      category: 'collectibles',
      condition: 'fair',
      startingPrice: 3000,
      reservePrice: 4500,
      bidIncrement: 100,
      imageText: 'Baseball+Cards'
    },
    {
      title: 'Upcoming: Fender Stratocaster Electric Guitar',
      description: 'Classic Fender Stratocaster, sunburst finish. Great tone, excellent playability.',
      category: 'music',
      condition: 'good',
      startingPrice: 600,
      reservePrice: 900,
      bidIncrement: 25,
      imageText: 'Fender+Stratocaster'
    },
  ];

  const total = Number.isFinite(count) && count > 0 ? count : DEFAULT_COUNT;
  const batchId = Date.now();
  const auctions = Array.from({ length: total }).map((_, i) => {
    const t = templates[i % templates.length];
    const startInDays = randomInt(1, 14); // 1-14 days in future
    const endAfterDays = randomInt(1, 7); // 1-7 days after start
    const startTime = daysFromNow(startInDays);
    const endTime = new Date(startTime.getTime() + endAfterDays * 24 * 60 * 60 * 1000);

    // Suffix titles when duplicating templates to keep items distinguishable
    const uniqueTitle = total > templates.length ? `${t.title} #${i + 1}` : t.title;

    return {
      title: uniqueTitle,
      description: t.description,
      category: t.category,
      condition: t.condition,
      startingPrice: t.startingPrice,
      reservePrice: t.reservePrice,
      bidIncrement: t.bidIncrement,
      images: [{ url: `https://via.placeholder.com/400x300?text=${t.imageText}`, alt: t.title, isPrimary: true }],
      tags: uniqueTitle.toLowerCase().split(/\s+/),
      seller: sellerId,
      startTime,
      endTime,
      status: 'upcoming',
      // batch marker to make this run easy to identify later
      metadata: { batch: `upcoming-${batchId}` }
    };
  });

  return auctions;
};

const main = async () => {
  try {
    await connectDB();
    const seller = await ensureSeller();
    console.log('Using seller:', seller.username, seller._id.toString());

    const desiredCount = REQUESTED_COUNT ?? DEFAULT_COUNT;
    console.log(`Seeding upcoming auctions count: ${desiredCount}`);
    const auctions = buildUpcomingAuctions(seller._id, desiredCount);
    const result = await Auction.insertMany(auctions);
    console.log(`Inserted ${result.length} upcoming auctions.`);
    result.forEach(a => {
      console.log(`- ${a.title} | start=${a.startTime.toISOString()} | end=${a.endTime.toISOString()} | id=${a._id}`);
    });

    const countUpcoming = await Auction.countDocuments({ status: 'upcoming', startTime: { $gt: new Date() } });
    console.log(`Upcoming auctions in DB with future start: ${countUpcoming}`);
  } catch (err) {
    console.error('Error creating upcoming auctions:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

main();