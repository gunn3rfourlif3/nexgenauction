require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@nexgenauction.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists, deleting...');
      await User.deleteOne({ email: 'admin@nexgenauction.com' });
    }

    // Create new admin user (this will trigger the pre-save middleware for password hashing)
    const adminUser = new User({
      username: 'admin',
      email: 'admin@nexgenauction.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      isVerified: true,
      role: 'admin'
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    
    // Test the password
    const isValid = await adminUser.comparePassword('password123');
    console.log('Password validation test:', isValid);

    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();