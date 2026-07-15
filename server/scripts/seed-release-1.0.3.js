/**
 * Seed managed release v1.0.3 isHome + GitHub URLs + notes.
 * Run after tag publish: node scripts/seed-release-1.0.3.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const Release = require('../src/models/Release');

const VERSION = '1.0.3';
const GH =
  'https://github.com/vishvajeet2012/JavaScript-compiler/releases/download/v1.0.3';

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    arch: 'x64',
    label: 'Download for Windows',
    fileName: 'JS-Compiler-Setup-1.0.3.exe',
    downloadUrl: `${GH}/JS-Compiler-Setup-1.0.3.exe`,
    note: 'NSIS · Auto-update',
  },
  {
    id: 'linux',
    name: 'Linux',
    arch: 'x64 · AppImage',
    label: 'Download AppImage',
    fileName: 'JS-Compiler-1.0.3.AppImage',
    downloadUrl: `${GH}/JS-Compiler-1.0.3.AppImage`,
    note: 'Portable AppImage',
  },
  {
    id: 'linux-deb',
    name: 'Linux',
    arch: 'x64 · .deb',
    label: 'Download .deb',
    fileName: 'JS-Compiler-1.0.3.deb',
    downloadUrl: `${GH}/JS-Compiler-1.0.3.deb`,
    note: 'Debian / Ubuntu',
  },
  {
    id: 'mac-arm64',
    name: 'macOS',
    arch: 'Apple Silicon',
    label: 'Download for Mac (Apple Silicon)',
    fileName: 'JS-Compiler-1.0.3-arm64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.0.3-arm64.dmg`,
    note: 'DMG arm64',
  },
  {
    id: 'mac-x64',
    name: 'macOS',
    arch: 'Intel',
    label: 'Download for Mac (Intel)',
    fileName: 'JS-Compiler-1.0.3-x64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.0.3-x64.dmg`,
    note: 'DMG x64',
  },
];

async function main() {
  await connectDB();

  await Release.updateMany(
    { isHome: true, version: { $ne: VERSION } },
    { $set: { isHome: false, isOutdated: true } },
  );

  await Release.findOneAndUpdate(
    { version: VERSION },
    {
      $set: {
        version: VERSION,
        title: 'JS Compiler v1.0.3',
        notes:
          'Promo key activation fix, Free vs Pro language lock, trial plan cleanup.',
        isHome: true,
        isOutdated: false,
        isPublished: true,
        publishedAt: new Date(),
        platforms,
        changelog: [
          'Promo keys activate correctly',
          'TS / HTML / Node Pro-only on Free',
          'Single free 7-day trial plan',
        ],
        added: [],
        fixed: [
          'PROMO- keys no longer rejected as invalid (hyphen formatting)',
          'Free plan blocked from TypeScript, HTML+JS, Node run/save',
          'Promo claim CORS on website',
        ],
        changed: [
          'Only one free 7-day trial plan (TRIAL_7D)',
          'Trial remains free (₹0)',
        ],
        removed: ['Duplicate ONETIME 7-day trial plan'],
      },
    },
    { upsert: true },
  );

  console.log('Seeded release', VERSION, 'isHome=true');
  await disconnectDB();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
