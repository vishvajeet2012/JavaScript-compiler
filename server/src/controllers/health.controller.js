const ApiResponse = require('../utils/ApiResponse');

/**
 * Health check controller
 */

/**
 * GET /api/v1/health
 * Returns server health status with uptime and memory info
 */
const getHealth = (req, res) => {
  const healthData = {
    status: 'healthy',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
  };

  ApiResponse.ok(healthData, 'Server is healthy').send(res);
};

module.exports = { getHealth };
