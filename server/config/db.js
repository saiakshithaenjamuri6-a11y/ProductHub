const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

let mongodInstance = null;

/**
 * Connect to MongoDB with intelligent persistence and fallback:
 * 1. If MONGODB_URI is provided and accessible (e.g. local daemon or MongoDB Atlas), connects directly.
 * 2. If no daemon is active or URI connection fails, automatically spins up an embedded
 *    disk-persisted MongoDB instance via MongoMemoryServer pointing to .mongodb_data/.
 *    This ensures data is permanently preserved across refreshes and restarts even without
 *    prior manual MongoDB installation.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const isExplicitUri = !!uri && !uri.includes('127.0.0.1:27017');

  // Try explicit external URI first (e.g. MongoDB Atlas)
  if (isExplicitUri) {
    try {
      console.log(`[Database] Attempting connection to configured MONGODB_URI...`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log(`[Database] Connected successfully to Cloud/External MongoDB: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      console.warn(`[Database] Failed to connect to external MONGODB_URI: ${err.message}`);
    }
  }

  // Try local MongoDB port 27017 if specified
  if (uri && uri.includes('127.0.0.1:27017')) {
    try {
      console.log(`[Database] Checking local MongoDB daemon on port 27017...`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000
      });
      console.log(`[Database] Connected to local MongoDB daemon: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      console.log(`[Database] Local MongoDB daemon on 27017 not detected (${err.message}).`);
    }
  }

  // Use embedded disk-persisted MongoDB server
  console.log('[Database] Starting persistent embedded MongoDB engine...');
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dbDir = path.resolve(__dirname, '../../.mongodb_data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbPath: dbDir,
        storageEngine: 'wiredTiger',
        launchTimeout: 30000
      }
    });

    const embeddedUri = mongodInstance.getUri();
    const conn = await mongoose.connect(embeddedUri, {
      dbName: 'producthub'
    });

    console.log(`[Database] Connected to Persistent MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    console.log(`[Database] Storage directory: ${dbDir}`);
    return conn;
  } catch (embeddedErr) {
    console.error(`[Database] Fatal: Failed to initialize embedded MongoDB: ${embeddedErr.message}`);
    throw embeddedErr;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
    console.log('[Database] Disconnected successfully');
  } catch (err) {
    console.error('[Database] Disconnect error:', err);
  }
};

module.exports = { connectDB, disconnectDB };
