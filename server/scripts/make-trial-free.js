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

  const updates = [
    {
      code: 'ONETIME',
      $set: {
        name: '7-Day Free Trial',
        price: 0,
        originalPrice: null,
        description: 'Free 7-day single-use trial key · full Pro · 1 device',
        features: ['Free · 7 days', '1 device', 'One-time use', 'Full Pro features'],
        planType: 'trial',
        oneTime: true,
        durationDays: 7,
        maxDevices: 1,
        seats: 1,
        active: true,
        sortOrder: 15,
      },
    },
    {
      code: 'TRIAL_7D',
      $set: {
        name: '7-Day Trial',
        price: 0,
        description: 'Free 7-day trial key — full Pro on 1 device (one-time use)',
        features: [
          '7 days full Pro',
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
  ];

  for (const u of updates) {
    const res = await PricingPlan.updateOne({ code: u.code }, { $set: u.$set }, { upsert: false });
    if (res.matchedCount === 0) {
      await PricingPlan.create({ code: u.code, currency: 'INR', ...u.$set });
      console.log(`Created plan ${u.code} at price 0`);
    } else {
      console.log(
        `Updated ${u.code}: matched=${res.matchedCount} modified=${res.modifiedCount}`,
      );
    }
  }

  const plans = await PricingPlan.find({
    code: { $in: ['ONETIME', 'TRIAL_7D'] },
  })
    .select('code name price durationDays oneTime active')
    .lean();

  console.log('\nResult:');
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
