const mongoose = require('mongoose');

/**
 * Connects to MongoDB (Atlas or local) and enables async-local
 * storage so Mongoose sessions work correctly with transactions.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  mongoose.set('transactionAsyncLocalStorage', true);

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
