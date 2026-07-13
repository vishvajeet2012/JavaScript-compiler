const mongoose = require('mongoose');
const config = require('./index');

/**
 * MongoDB connection — safe for local server + Vercel serverless
 * Reuses the same connection across warm invocations
 */

let connecting = null;

const connectDB = async () => {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // In-flight connect
  if (connecting) return connecting;

  connecting = mongoose
    .connect(config.db.uri, {
      // Serverless-friendly
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 5,
    })
    .then((conn) => {
      console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
      connecting = null;
      return conn;
    })
    .catch((error) => {
      connecting = null;
      console.error(`[DB] Connection error: ${error.message}`);
      // Don't process.exit on Vercel — throw so handler can return 503
      if (process.env.VERCEL) {
        throw error;
      }
      process.exit(1);
    });

  return connecting;
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[DB] Database disconnected');
    }
  } catch (error) {
    console.error(`[DB] Disconnect error: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
