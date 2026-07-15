/**
 * Set 7-day trial plans to FREE (price 0) in MongoDB.
 * Targets: ONETIME (was ₹49) and ensures TRIAL_7D stays free.
 *
 * Usage: node scripts/make-trial-free.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const PricingPlan = require('../src/models/PricingPlan');

async function main() {
  await connectDB();

  // Single free trial only — TRIAL_7D. Remove ONETIME duplicate if present.
  const res = await PricingPlan.updateOne(
    { code: 'TRIAL_7D' },
    {
      $set: {
        name: '7-Day Free Trial',
        price: 0,
        description: 'Free 7-day trial key — full Pro on 1 device (one-time use)',
        features: [
          'Free · 7 days full Pro',
          'Unlimited snippets',
          'Export + version history',
          'TS / HTML+JS / Node',
          '1 device · one-time key',
        ],
        planType: 'trial',
        oneTime: true,
        durationDays: 7,
        maxDevices: 1,
        seats: 1,
        active: true,
        sortOrder: 10,
      },
    },
  );
  console.log(`TRIAL_7D: matched=${res.matchedCount} modified=${res.modifiedCount}`);

  const onetime = await PricingPlan.findOne({ code: 'ONETIME' });
  if (onetime) {
    console.log('ONETIME still exists — run: node scripts/fix-duplicate-trials.js');
  }

  const plans = await PricingPlan.find({
    $or: [{ planType: 'trial' }, { code: 'TRIAL_7D' }],
  })
    .select('code name price durationDays oneTime active')
    .lean();

  console.log('\nTrial plans:');
  plans.forEach((p) => {
    console.log(
      `  ${p.code} | ${p.name} | price=${p.price} | days=${p.durationDays} | oneTime=${p.oneTime} | active=${p.active}`,
    );
  });

  await disconnectDB();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
