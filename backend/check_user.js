require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@nexgenauction.com' }).select('+password');
    
    if (adminUser) {
      console.log('Admin user found:');
      console.log('ID:', adminUser._id);
      console.log('Username:', adminUser.username);
      console.log('Email:', adminUser.email);
      console.log('Role:', adminUser.role);
      console.log('Password hash:', adminUser.password);
      
      // Test password comparison
      const testPassword = 'password123';
      const isValid = await adminUser.comparePassword(testPassword);
      console.log('Password "password123" is valid:', isValid);
      
    } else {
      console.log('Admin user not found');
      
      // List all users
      const allUsers = await User.find({}).select('username email role');
      console.log('All users in database:');
      allUsers.forEach(user => {
        console.log(`- ${user.username} (${user.email}) - Role: ${user.role}`);
      });
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();