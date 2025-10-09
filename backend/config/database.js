const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // For development without MongoDB, skip connection unless FORCE_DB_CONNECTION is explicitly 'true'
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      console.log('Running in development mode without MongoDB connection');
      console.log('Set FORCE_DB_CONNECTION=true in .env to enable database connection');
      // Disable Mongoose buffering so accidental model calls fail fast instead of stalling
      try {
        mongoose.set('bufferCommands', false);
        // bufferTimeoutMS is available on connection options; set 0 via global for completeness
        mongoose.set('bufferTimeoutMS', 0);
      } catch (_) {}
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Avoid long stalls on unreachable MongoDB
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || '2000', 10),
      socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS || '8000', 10),
      connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS || '3000', 10),
      // Prevent command buffering waiting for initial connect
      bufferCommands: false,
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