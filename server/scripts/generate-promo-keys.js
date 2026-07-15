/**
 * Generate promotional Pro keys (expire 2028-01-01) + seed website promo + sample announcement.
 *
 * Usage (from /server with MONGODB_URI set):
 *   node scripts/generate-promo-keys.js
 *
 * Prints keys to stdout so you can paste into Admin if needed.
 */

const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB } = require('../src/config/db');
const PricingPlan = require('../src/models/PricingPlan');
const LicenseKey = require('../src/models/LicenseKey');
const PromoOffer = require('../src/models/PromoOffer');
const Announcement = require('../src/models/Announcement');

const KEY_EXPIRES = new Date('2028-01-01T00:00:00.000Z');
const SHOW_UNTIL = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // ~2 months
const COUNT = 12;

function randomSegment(len = 4) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function makeKey() {
  return `PROMO-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
}

async function ensurePromoPlan() {
  let plan = await PricingPlan.findOne({ code: 'PROMO_FREE' });
  if (plan) return plan;
  plan = await PricingPlan.create({
    name: 'Promo Free (until 2028)',
    code: 'PROMO_FREE',
    price: 0,
    currency: 'INR',
    durationDays: 0,
    maxDevices: 1,
    oneTime: false,
    planType: 'standard',
    seats: 1,
    sortOrder: 5,
    description: 'Promotional free Pro key — valid until 1 Jan 2028',
    features: [
      'Full Pro features',
      'Valid until 1 January 2028',
      '1 device',
      'Website / launch promo',
    ],
    active: true,
  });
  return plan;
}

async function main() {
  await connectDB();
  const plan = await ensurePromoPlan();
  const keys = [];

  for (let i = 0; i < COUNT; i += 1) {
    let key;
    for (let a = 0; a < 30; a += 1) {
      key = makeKey();
      // eslint-disable-next-line no-await-in-loop
      const exists = await LicenseKey.exists({ key });
      if (!exists) break;
    }
    // eslint-disable-next-line no-await-in-loop
    await LicenseKey.create({
      key,
      plan: plan._id,
      planCode: plan.code,
      planName: plan.name,
      price: 0,
      currency: 'INR',
      maxDevices: 1,
      oneTime: false,
      expiresAt: KEY_EXPIRES,
      note: 'Website promo free key · expires 2028-01-01',
      status: 'active',
      devices: [],
    });
    keys.push(key);
  }

  await PromoOffer.findOneAndUpdate(
    { code: 'WEB_FREE_2M' },
    {
      code: 'WEB_FREE_2M',
      title: 'Free Pro key — limited launch promo',
      message:
        'Activate JS Compiler Pro free until 1 January 2028. Copy a key below and paste it in the desktop app (Activate Pro). Offer shown on the website for 2 months.',
      keys,
      keyExpiresAt: KEY_EXPIRES,
      showUntil: SHOW_UNTIL,
      active: true,
    },
    { upsert: true, new: true },
  );

  await Announcement.findOneAndUpdate(
    { title: 'Free Pro promo is live' },
    {
      title: 'Free Pro promo is live',
      body:
        'Get a free promotional Pro key on our website (jsplay-kappa.vercel.app). Keys work until 1 January 2028. Open Activate Pro and paste your key.',
      type: 'promo',
      active: true,
      priority: 100,
      startsAt: new Date(),
      endsAt: SHOW_UNTIL,
      ctaLabel: 'Open website',
      ctaUrl: 'https://jsplay-kappa.vercel.app',
    },
    { upsert: true, new: true },
  );

  console.log('\n=== PROMO KEYS (expires 2028-01-01) ===\n');
  keys.forEach((k, i) => console.log(`${i + 1}. ${k}`));
  console.log('\n=== META ===');
  console.log('Plan: PROMO_FREE');
  console.log('Key expires:', KEY_EXPIRES.toISOString());
  console.log('Website popup until:', SHOW_UNTIL.toISOString());
  console.log('Promo code: WEB_FREE_2M');
  console.log('\nDone. Keys are active in MongoDB + PromoOffer + Announcement.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
