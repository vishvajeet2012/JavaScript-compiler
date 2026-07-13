/**
 * Seed default pricing plans + generate sample license keys
 * Run: node scripts/seed-and-generate-keys.js
 */

const { connectDB, disconnectDB } = require('../src/config/db');
const keyService = require('../src/services/key.service');

async function main() {
  await connectDB();

  const seed = await keyService.seedDefaultPlans();
  console.log('Seed plans:', seed);

  const plans = await keyService.listPlans();
  console.log(
    'Plans:',
    plans.map((p) => `${p.code} (${p._id}) ₹${p.price}`).join(' | ')
  );

  if (!plans.length) {
    console.error('No plans found');
    process.exit(1);
  }

  const generated = [];
  for (const plan of plans) {
    const keys = await keyService.generateKeys({
      planId: plan._id,
      count: 2,
      note: `seed-sample · ${plan.code}`,
    });
    keys.forEach((k) => {
      generated.push({
        plan: plan.code,
        key: k.key,
        maxDevices: k.maxDevices,
        oneTime: k.oneTime,
        expiresAt: k.expiresAt,
      });
      console.log(`  [${plan.code}] ${k.key}`);
    });
  }

  console.log(`\nGenerated ${generated.length} sample keys.`);
  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Failed:', err.message);
  try {
    await disconnectDB();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
