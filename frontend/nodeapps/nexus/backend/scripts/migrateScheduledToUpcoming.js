// Migration: Update auctions with status 'scheduled' to 'upcoming'
// Also normalize 'Upcoming Auctions' category description
// Usage: node backend/scripts/migrateScheduledToUpcoming.js
// Env: MONGODB_URI (optional)
const mongoose = require('mongoose');
require('dotenv').config();

const Auction = require('../models/Auction');
const Category = require('../models/Category');

async function connectDB() {
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
}

async function migrateAuctions() {
  const now = new Date();
  const filter = { status: 'scheduled' };
  const update = { $set: { status: 'upcoming' } };
  const result = await Auction.updateMany(filter, update);
  console.log(`Auctions migrated from 'scheduled' to 'upcoming': matched=${result.matchedCount || result.n}, modified=${result.modifiedCount || result.nModified}`);

  // Optional check: count upcoming with future start (informational)
  const upcomingFuture = await Auction.countDocuments({ status: 'upcoming', startTime: { $gt: now } });
  console.log(`Upcoming auctions with future start after migration: ${upcomingFuture}`);
}

async function normalizeUpcomingCategory() {
  // Ensure description is standardized; also rename any 'Scheduled Auctions' to 'Upcoming Auctions'
  const targetDesc = 'Upcoming auctions starting soon';

  const scheduledCat = await Category.findOne({ name: 'Scheduled Auctions' });
  if (scheduledCat) {
    scheduledCat.name = 'Upcoming Auctions';
    scheduledCat.description = targetDesc;
    await scheduledCat.save();
    console.log(`Renamed category 'Scheduled Auctions' -> 'Upcoming Auctions' (id=${scheduledCat._id})`);
  }

  const upcomingCat = await Category.findOne({ name: 'Upcoming Auctions' });
  if (upcomingCat) {
    if (upcomingCat.description !== targetDesc) {
      upcomingCat.description = targetDesc;
      await upcomingCat.save();
      console.log(`Updated 'Upcoming Auctions' description to standardized text (id=${upcomingCat._id})`);
    } else {
      console.log('Upcoming Auctions category description already standardized');
    }
  } else {
    console.log('No existing Upcoming Auctions category found; seeder can create it.');
  }
}

async function main() {
  try {
    await connectDB();
    await migrateAuctions();
    await normalizeUpcomingCategory();
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

main();
