const config = require('./index');

/**
 * Database configuration (MongoDB placeholder)
 *
 * Uncomment and install mongoose when ready to connect:
 *   npm install mongoose
 *
 * Usage in server.js:
 *   const { connectDB } = require('./src/config/db');
 *   await connectDB();
 */

const connectDB = async () => {
  try {
    // const mongoose = require('mongoose');
    // const conn = await mongoose.connect(config.db.uri, {
    //   // Mongoose 7+ no longer needs these options, but kept for reference
    // });
    // console.log(`MongoDB connected: ${conn.connection.host}`);

    console.log('[DB] Database connection placeholder — install mongoose to enable');
  } catch (error) {
    console.error(`[DB] Connection error: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    // await require('mongoose').disconnect();
    console.log('[DB] Database disconnected');
  } catch (error) {
    console.error(`[DB] Disconnect error: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
