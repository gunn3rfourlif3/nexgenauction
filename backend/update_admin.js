require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function updateUserToAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the first user and update their role to admin
    const user = await User.findOne({ email: 'artdealer@example.com' });
    
    if (user) {
      user.role = 'admin';
      await user.save();
      console.log(`Updated user ${user.email} to admin role`);
      console.log('User details:', {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } else {
      console.log('No user found with email artdealer@example.com');
      
      // List all users
      const allUsers = await User.find({}).select('username email role');
      console.log('All users in database:', allUsers);
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateUserToAdmin();