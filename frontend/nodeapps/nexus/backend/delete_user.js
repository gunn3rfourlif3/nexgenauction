require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

function getArg(name, fallback) {
  const flag = `--${name}`;
  const idx = process.argv.findIndex(a => a === flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('Missing MONGODB_URI. Set it in backend/.env or export before running.');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const email = (getArg('email', process.env.EMAIL || '') || '').toLowerCase();
    const username = (getArg('username', process.env.USERNAME || '') || '').trim();
    const dryRun = (getArg('dry', 'false') || '').toLowerCase() === 'true';

    if (!email && !username) {
      console.error('Provide --email or --username to delete a user.');
      process.exit(1);
    }

    const query = email ? { email } : { username };
    const user = await User.findOne(query).select('+password');

    if (!user) {
      console.log('No matching user found for', query);
      await mongoose.connection.close();
      console.log('Database connection closed');
      process.exit(2);
    }

    console.log('User to delete:');
    console.log({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      isActive: user.isActive
    });

    if (dryRun) {
      console.log('Dry run enabled. No deletion performed.');
    } else {
      const res = await User.deleteOne({ _id: user._id });
      console.log('Deletion result:', res);
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
}

main();