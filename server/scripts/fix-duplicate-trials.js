/**
 * Keep a single free 7-day trial plan (TRIAL_7D).
 * Merge ONETIME (and any other trial dupes) keys onto TRIAL_7D, then remove extras.
 *
 * Usage: node scripts/fix-duplicate-trials.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const PricingPlan = require('../src/models/PricingPlan');
const LicenseKey = require('../src/models/LicenseKey');

const KEEP_CODE = 'TRIAL_7D';
const REMOVE_CODES = ['ONETIME']; // was the ₹49 trial, now free duplicate

async function main() {
  await connectDB();

  let keep = await PricingPlan.findOne({ code: KEEP_CODE });
  if (!keep) {
    keep = await PricingPlan.create({
      name: '7-Day Free Trial',
      code: KEEP_CODE,
      price: 0,
      currency: 'INR',
      durationDays: 7,
      maxDevices: 1,
      oneTime: true,
      planType: 'trial',
      seats: 1,
      sortOrder: 10,
      description: 'Free 7-day trial key — full Pro on 1 device (one-time use)',
      features: [
        'Free · 7 days full Pro',
        'Unlimited snippets',
        'Export + version history',
        'TS / HTML+JS / Node',
        '1 device · one-time key',
      ],
      active: true,
    });
    console.log('Created', KEEP_CODE);
  } else {
    keep.name = '7-Day Free Trial';
    keep.price = 0;
    keep.durationDays = 7;
    keep.oneTime = true;
    keep.planType = 'trial';
    keep.maxDevices = 1;
    keep.seats = 1;
    keep.active = true;
    keep.sortOrder = 10;
    keep.description =
      'Free 7-day trial key — full Pro on 1 device (one-time use)';
    keep.features = [
      'Free · 7 days full Pro',
      'Unlimited snippets',
      'Export + version history',
      'TS / HTML+JS / Node',
      '1 device · one-time key',
    ];
    await keep.save();
    console.log('Normalized', KEEP_CODE, 'price=0');
  }

  // Find all other trial-like duplicates
  const all = await PricingPlan.find({
    $or: [
      { planType: 'trial' },
      { code: { $in: REMOVE_CODES } },
      { name: /7[\s-]*day.*trial/i },
      { name: /trial.*7/i },
    ],
  });

  const toRemove = all.filter((p) => p.code !== KEEP_CODE);
  console.log(
    'Duplicates to remove:',
    toRemove.map((p) => p.code).join(', ') || '(none)',
  );

  for (const dup of toRemove) {
    const byId = await LicenseKey.updateMany(
      { plan: dup._id },
      {
        $set: {
          plan: keep._id,
          planCode: keep.code,
          planName: keep.name,
          price: 0,
        },
      },
    );
    const byCode = await LicenseKey.updateMany(
      { planCode: dup.code },
      {
        $set: {
          plan: keep._id,
          planCode: keep.code,
          planName: keep.name,
          price: 0,
        },
      },
    );
    console.log(
      `  ${dup.code}: remapped keys planId=${byId.modifiedCount} planCode=${byCode.modifiedCount}`,
    );
    await PricingPlan.deleteOne({ _id: dup._id });
    console.log(`  Deleted plan ${dup.code}`);
  }

  // Deactivate any remaining weird free 7-day extras by name (not TRIAL_7D)
  const leftover = await PricingPlan.find({
    code: { $ne: KEEP_CODE },
    durationDays: 7,
    price: 0,
    planType: 'trial',
  });
  for (const p of leftover) {
    const n = await LicenseKey.updateMany(
      { $or: [{ plan: p._id }, { planCode: p.code }] },
      {
        $set: {
          plan: keep._id,
          planCode: keep.code,
          planName: keep.name,
          price: 0,
        },
      },
    );
    await PricingPlan.deleteOne({ _id: p._id });
    console.log(`  Removed leftover ${p.code}, keys moved=${n.modifiedCount}`);
  }

  const trials = await PricingPlan.find({
    $or: [{ planType: 'trial' }, { code: KEEP_CODE }, { name: /trial/i }],
  })
    .select('code name price durationDays oneTime active')
    .lean();

  console.log('\nTrial plans left:');
  trials.forEach((p) => {
    console.log(
      `  ${p.code} | ${p.name} | ₹${p.price} | ${p.durationDays}d | active=${p.active}`,
    );
  });

  await disconnectDB();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
