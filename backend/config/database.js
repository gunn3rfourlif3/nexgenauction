const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // For development without MongoDB, skip connection unless FORCE_DB_CONNECTION is explicitly 'true'
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      console.log('Running in development mode without MongoDB connection');
      console.log('Set FORCE_DB_CONNECTION=true in .env to enable database connection');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    // Don't exit the process in development mode
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;