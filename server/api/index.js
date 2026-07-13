/**
 * Vercel serverless entry — exports Express app
 * Root Directory on Vercel must be: server
 */

const app = require('../src/app');
const { connectDB } = require('../src/config/db');

// Ensure DB is connected before handling requests (cached across warm invocations)
let ready;

async function ensureReady() {
  if (!ready) {
    ready = connectDB().then(async () => {
      try {
        const { seedDefaultPlans } = require('../src/services/key.service');
        await seedDefaultPlans();
      } catch (e) {
        console.warn('[Vercel] seed skipped:', e.message);
      }
    });
  }
  return ready;
}

module.exports = async (req, res) => {
  try {
    await ensureReady();
  } catch (err) {
    console.error('[Vercel] DB connect failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        message: 'Database unavailable',
        error: err.message,
      })
    );
    return;
  }

  return app(req, res);
};
