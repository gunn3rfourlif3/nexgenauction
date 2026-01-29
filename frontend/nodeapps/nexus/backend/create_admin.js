require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

function getArg(name, fallback) {
  const idx = process.argv.findIndex(a => a === `--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env[name.toUpperCase()] || fallback;
}

async function createAdmin() {
  try {
    const email = getArg('email', 'admin@nexgenauction.com');
    const password = getArg('password', 'password123');
  const username = getArg('username', 'admin');
  const firstName = getArg('first', 'Admin');
  const lastName = getArg('last', 'User');
  const role = getArg('role', 'admin');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set. Enable DB connection and provide URI.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Remove existing user with same email
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`User with ${email} exists, deleting...`);
      await User.deleteOne({ email });
    }

    const adminUser = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      isVerified: true,
      role
    });

    await adminUser.save();
    console.log(`Admin user created: ${email}`);

    const isValid = await adminUser.comparePassword(password);
    console.log('Password validation test:', isValid);

    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();