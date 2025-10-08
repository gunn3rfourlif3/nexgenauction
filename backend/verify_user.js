require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

function getArg(name, fallback) {
  const idx = process.argv.findIndex(a => a === `--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  try {
    const uri = process.env.MONGODB_URI || getArg('uri', null);
    if (!uri) {
      throw new Error('MONGODB_URI is not set. Provide it via env or --uri.');
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const email = (getArg('email', process.env.EMAIL || '') || '').toLowerCase();
    if (!email) {
      throw new Error('Provide --email to verify a specific user.');
    }

    const testPassword = getArg('password', process.env.PASSWORD || '');

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log(`No user found with email ${email}`);
    } else {
      console.log('User found:');
      console.log('ID:', user._id);
      console.log('Username:', user.username);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Password hash:', user.password);

      if (testPassword) {
        const isValid = await user.comparePassword(testPassword);
        console.log(`Password "${testPassword}" is valid:`, isValid);
      } else {
        console.log('No test password provided. Skipping password validation.');
      }
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

main();