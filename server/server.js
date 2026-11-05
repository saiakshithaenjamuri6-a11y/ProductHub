const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { connectDB, disconnectDB } = require('./config/db');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for debugging & audit
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.url.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Serve frontend static assets
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// API Routes
app.use('/api/products', productRoutes);

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ProductHub API is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// Serve client index.html for any unmatched non-API routes (SPA fallback)
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.url}`
    });
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Server and Process Lifecycle Management
let server = null;
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[ProductHub] Received ${signal}. Initiating graceful shutdown...`);

  // Stop accepting new HTTP requests
  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        console.log('[ProductHub] HTTP server closed.');
        resolve();
      });
    });
  }

  // Gracefully close MongoDB and stop embedded server
  await disconnectDB();

  console.log('[ProductHub] Clean shutdown completed.');
  process.exit(0);
};

// Start Server
const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed sample products if database is completely empty
    const Product = require('./models/Product');
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('[ProductHub] Database is empty. Seeding initial catalogue...');
      const { sampleProducts } = require('./seed');
      await Product.insertMany(sampleProducts);
      console.log(`[ProductHub] Successfully auto-seeded ${sampleProducts.length} initial products!`);
    }

    server = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`  🚀 ProductHub Server running on port ${PORT}`);
      console.log(`  🌐 Frontend: http://localhost:${PORT}`);
      console.log(`  🔌 API Base: http://localhost:${PORT}/api/products`);
      console.log(`===============================================`);
    });

    server.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[ProductHub] ERROR: Port ${PORT} is already in use by another application or instance.`);
        console.error(`Please stop the process using port ${PORT} or configure a different PORT in .env.`);
      } else {
        console.error('[ProductHub] Server error:', err.message);
      }
      await disconnectDB();
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    await disconnectDB();
    process.exit(1);
  }
};

// Register Termination Signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Windows-specific Ctrl+C bridge
if (process.platform === 'win32') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

// Uncaught Exception and Unhandled Rejection Guards
process.on('uncaughtException', async (err) => {
  console.error('[ProductHub] Uncaught Exception:', err);
  await gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('[ProductHub] Unhandled Rejection at:', promise, 'reason:', reason);
  await gracefulShutdown('unhandledRejection');
});

// Run server if executed directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, gracefulShutdown };
