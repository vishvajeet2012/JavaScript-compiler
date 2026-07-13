const app = require('./src/app');
const config = require('./src/config');
// const { connectDB, disconnectDB } = require('./src/config/db');

/**
 * Server entry point
 * Starts the Express server and handles graceful shutdown
 */

const startServer = async () => {
  try {
    // Connect to database (uncomment when ready)
    // await connectDB();

    const server = app.listen(config.port, () => {
      console.log(`
  ╔══════════════════════════════════════════════╗
  ║                                              ║
  ║   🚀  Server is running!                     ║
  ║                                              ║
  ║   Environment : ${config.env.padEnd(27)}║
  ║   Port        : ${String(config.port).padEnd(27)}║
  ║   CORS Origin : ${config.corsOrigin.padEnd(27)}║
  ║   Health      : http://localhost:${config.port}/api/v1/health  ║
  ║                                              ║
  ╚══════════════════════════════════════════════╝
      `);
    });

    // ---- Graceful Shutdown ----
    const gracefulShutdown = (signal) => {
      console.log(`\n[SERVER] ${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log('[SERVER] HTTP server closed');

        // Disconnect database (uncomment when ready)
        // await disconnectDB();

        console.log('[SERVER] Cleanup complete. Exiting.');
        process.exit(0);
      });

      // Force shutdown after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error('[SERVER] Forced shutdown — could not close connections in time');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('[SERVER] Uncaught Exception:', err);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    console.error('[SERVER] Failed to start:', error);
    process.exit(1);
  }
};

startServer();
