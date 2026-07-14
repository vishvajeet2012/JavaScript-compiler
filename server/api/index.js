/**
 * Vercel serverless entry — Express app
 * Project Root Directory on Vercel MUST be: server
 *
 * Routes:
 *   /api/v1/*     — public API + admin
 *   /api/activate — Electron license activate
 *   /api/verify   — Electron license verify
 */

const app = require('../src/app');
const { connectDB } = require('../src/config/db');

// Cached across warm invocations on the same isolate
let ready;

async function ensureReady() {
  if (!ready) {
    ready = connectDB()
      .then(async () => {
        try {
          const { seedDefaultPlans } = require('../src/services/key.service');
          await seedDefaultPlans();
        } catch (e) {
          console.warn('[Vercel] seed skipped:', e.message);
        }
      })
      .catch((err) => {
        ready = null;
        throw err;
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(
      JSON.stringify({
        success: false,
        message: 'Database unavailable',
        error: process.env.NODE_ENV === 'production' ? undefined : err.message,
      })
    );
    return;
  }

  return app(req, res);
};
