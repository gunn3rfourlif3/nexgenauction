require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

function getArg(flag, fallback) {
  const idx = process.argv.findIndex(a => a === flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function updateUserRole() {
  try {
    const email = getArg('--email', process.env.EMAIL || process.env.USER_EMAIL || '');
    const role = (getArg('--role', process.env.ROLE || process.env.TARGET_ROLE || 'admin') || '').toLowerCase();
    const newUsernameRaw = getArg('--username', process.env.USERNAME || '');
    const newUsername = (newUsernameRaw || '').trim();

    if (!process.env.MONGODB_URI) {
      console.error('Missing MONGODB_URI. Set it in backend/.env');
      process.exit(1);
    }

    if (!email) {
      console.error('Missing email. Provide via --email or EMAIL env.');
      process.exit(1);
    }

    if (!['user', 'admin', 'super'].includes(role)) {
      console.error(`Invalid role "${role}". Allowed: user, admin, super.`);
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`No user found with email ${email}`);
      const allUsers = await User.find({}).select('username email role');
      console.log('All users in database:', allUsers);
      await mongoose.connection.close();
      console.log('Database connection closed');
      process.exit(2);
    }

    const prevRole = user.role;
    user.role = role;

    if (newUsername) {
      if (newUsername.length < 3 || newUsername.length > 30) {
        console.error('Username must be between 3 and 30 characters.');
        process.exit(1);
      }
      if (newUsername !== user.username) {
        const existingByUsername = await User.findOne({ username: newUsername });
        if (existingByUsername && existingByUsername._id.toString() !== user._id.toString()) {
          console.error(`Username "${newUsername}" is already taken by another user.`);
          process.exit(1);
        }
        user.username = newUsername;
      }
    }
    await user.save();

    console.log(`Updated user ${user.email} role: ${prevRole} -> ${user.role}`);
    console.log('User details:', {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    try {
      await mongoose.connection.close();
    } catch (_) {}
    process.exit(1);
  }
}

updateUserRole();