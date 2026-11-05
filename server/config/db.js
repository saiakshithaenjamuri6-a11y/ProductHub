const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mongoose = require('mongoose');

let mongodInstance = null;
let isInstanceOwner = false;

const dbDir = path.resolve(__dirname, '../../.mongodb_data');
const instanceMetaPath = path.join(dbDir, '.active_instance.json');
const PREFERRED_EMBEDDED_PORT = parseInt(process.env.EMBEDDED_MONGODB_PORT, 10) || 27018;

/**
 * Check if a PID is actively running on the system
 */
function isPidRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Safely terminate a process by PID to release lock handles without file corruption
 */
function terminateProcess(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid} >nul 2>&1`);
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch (err) {
    // Process already exited or permission denied
  }
}

/**
 * Test if a MongoDB connection string is currently accepting connections
 */
async function testMongoConnection(uri, timeoutMs = 2500) {
  try {
    const conn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: timeoutMs
    }).asPromise();
    await conn.close();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Connect to MongoDB with intelligent lifecycle management:
 * 1. Checks external / configured MONGODB_URI (e.g. MongoDB Atlas or local daemon at 27017).
 * 2. Checks if an embedded instance is ALREADY running on the machine (e.g. at port 27018 or via metadata).
 *    If active, reuses that instance to prevent DBPathInUse lock collisions.
 * 3. Handles orphaned mongod processes if a previous process died abruptly.
 * 4. Launches a single persistent embedded MongoMemoryServer instance bound to .mongodb_data/.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const isExplicitCloud = !!uri && !uri.includes('127.0.0.1:27017') && !uri.includes('localhost:27017');

  // Step 1: Explicit Cloud / External URI (e.g., MongoDB Atlas)
  if (isExplicitCloud) {
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

  // Step 2: Standard local MongoDB daemon on port 27017
  if (uri && (uri.includes('127.0.0.1:27017') || uri.includes('localhost:27017'))) {
    try {
      const is27017Online = await testMongoConnection(uri, 1500);
      if (is27017Online) {
        console.log(`[Database] Connecting to local MongoDB daemon on port 27017...`);
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 3000
        });
        console.log(`[Database] Connected to local MongoDB daemon: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      }
    } catch (err) {
      // 27017 is not available, proceed to embedded check
    }
  }

  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Step 3: Check if an embedded MongoDB instance is already running
  const fallbackUri = `mongodb://127.0.0.1:${PREFERRED_EMBEDDED_PORT}/producthub`;
  let activeMetadata = null;

  if (fs.existsSync(instanceMetaPath)) {
    try {
      activeMetadata = JSON.parse(fs.readFileSync(instanceMetaPath, 'utf8'));
    } catch (e) {
      activeMetadata = null;
    }
  }

  const checkUri = (activeMetadata && activeMetadata.uri) ? activeMetadata.uri : fallbackUri;
  const isAlreadyRunning = await testMongoConnection(checkUri, 2000);

  if (isAlreadyRunning) {
    console.log(`[Database] Found active embedded MongoDB instance at: ${checkUri}`);
    console.log(`[Database] Reusing existing MongoDB instance (preventing lock conflict).`);
    isInstanceOwner = false;
    const conn = await mongoose.connect(checkUri);
    console.log(`[Database] Connected successfully to active MongoDB: ${conn.connection.host}`);
    return conn;
  }

  // If not responding, check if an orphaned process from a previous crash is lingering
  if (activeMetadata) {
    if (activeMetadata.mongodPid && isPidRunning(activeMetadata.mongodPid)) {
      console.log(`[Database] Terminating orphaned mongod process (PID: ${activeMetadata.mongodPid}) to release lock...`);
      terminateProcess(activeMetadata.mongodPid);
      // Wait briefly for OS to release the file handle
      await new Promise(r => setTimeout(r, 1200));
    }
    if (activeMetadata.killerPid && isPidRunning(activeMetadata.killerPid)) {
      terminateProcess(activeMetadata.killerPid);
    }
    try {
      fs.unlinkSync(instanceMetaPath);
    } catch (e) {
      // Ignore
    }
  }

  // Step 4: Start fresh single MongoMemoryServer instance
  console.log('[Database] Starting persistent embedded MongoDB engine...');
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');

    mongodInstance = await MongoMemoryServer.create({
      instance: {
        port: PREFERRED_EMBEDDED_PORT,
        dbPath: dbDir,
        storageEngine: 'wiredTiger',
        launchTimeout: 35000
      }
    });

    isInstanceOwner = true;
    const embeddedUri = mongodInstance.getUri();
    const conn = await mongoose.connect(embeddedUri, {
      dbName: 'producthub'
    });

    const mongodPid = mongodInstance.instanceInfo?.instance?.mongodProcess?.pid;
    const killerPid = mongodInstance.instanceInfo?.instance?.killerProcess?.pid;

    // Save active instance metadata
    try {
      fs.writeFileSync(
        instanceMetaPath,
        JSON.stringify(
          {
            port: PREFERRED_EMBEDDED_PORT,
            uri: embeddedUri,
            nodePid: process.pid,
            mongodPid,
            killerPid,
            createdAt: new Date().toISOString()
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (e) {
      console.warn('[Database] Warning: Could not write active instance metadata:', e.message);
    }

    console.log(`[Database] Connected to Persistent MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    console.log(`[Database] Storage directory: ${dbDir}`);
    return conn;
  } catch (embeddedErr) {
    console.error(`[Database] Fatal: Failed to initialize embedded MongoDB: ${embeddedErr.message}`);
    throw embeddedErr;
  }
};

/**
 * Gracefully disconnect Mongoose and stop embedded MongoDB if owned
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[Database] Mongoose connection closed.');
    }

    if (isInstanceOwner && mongodInstance) {
      console.log('[Database] Stopping embedded MongoDB server...');
      await mongodInstance.stop();
      mongodInstance = null;
      isInstanceOwner = false;
      console.log('[Database] Embedded MongoDB stopped cleanly.');
    }

    // Clean up active instance metadata if owner
    if (fs.existsSync(instanceMetaPath) && isInstanceOwner) {
      try {
        fs.unlinkSync(instanceMetaPath);
      } catch (e) {
        // Ignore
      }
    }
  } catch (err) {
    console.error('[Database] Disconnect error:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
