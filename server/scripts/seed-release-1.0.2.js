/**
 * Seed Mongo managed release v1.0.2 with notes + isHome + GitHub asset URLs.
 * Usage: node scripts/seed-release-1.0.2.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const Release = require('../src/models/Release');

const VERSION = '1.0.2';
const GH =
  'https://github.com/vishvajeet2012/JavaScript-compiler/releases/download/v1.0.2';

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    arch: 'x64',
    label: 'Download for Windows',
    fileName: 'JS-Compiler-Setup-1.0.2.exe',
    downloadUrl: `${GH}/JS-Compiler-Setup-1.0.2.exe`,
    note: 'NSIS · Auto-update',
  },
  {
    id: 'linux',
    name: 'Linux',
    arch: 'x64 · AppImage',
    label: 'Download AppImage',
    fileName: 'JS-Compiler-1.0.2.AppImage',
    downloadUrl: `${GH}/JS-Compiler-1.0.2.AppImage`,
    note: 'Portable AppImage',
  },
  {
    id: 'linux-deb',
    name: 'Linux',
    arch: 'x64 · .deb',
    label: 'Download .deb',
    fileName: 'JS-Compiler-1.0.2.deb',
    downloadUrl: `${GH}/JS-Compiler-1.0.2.deb`,
    note: 'Debian / Ubuntu',
  },
  {
    id: 'mac-arm64',
    name: 'macOS',
    arch: 'Apple Silicon',
    label: 'Download for Mac (Apple Silicon)',
    fileName: 'JS-Compiler-1.0.2-arm64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.0.2-arm64.dmg`,
    note: 'DMG arm64',
  },
  {
    id: 'mac-x64',
    name: 'macOS',
    arch: 'Intel',
    label: 'Download for Mac (Intel)',
    fileName: 'JS-Compiler-1.0.2-x64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.0.2-x64.dmg`,
    note: 'DMG x64',
  },
];

async function main() {
  await connectDB();

  // Mark previous home as outdated
  await Release.updateMany(
    { isHome: true, version: { $ne: VERSION } },
    { $set: { isHome: false, isOutdated: true } },
  );

  const payload = {
    version: VERSION,
    title: 'JS Compiler v1.0.2',
    notes:
      'Admin banner, update notes, What’s New, website promo keys, multi-OS downloads.',
    isHome: true,
    isOutdated: false,
    isPublished: true,
    publishedAt: new Date(),
    platforms,
    changelog: [
      'Admin messages in desktop app',
      'What’s New + structured update notes',
      'Promo free keys on website',
    ],
    added: [
      'Admin broadcast banner in the desktop app',
      'Structured update notes (Added / Fixed / Changed / Removed)',
      'In-app What’s New (read without updating)',
      'Website free Pro promo popup with claimable keys',
    ],
    fixed: [
      'Activation server no longer editable as localhost in Settings',
      'Clearer update-check and offline errors',
      'Home downloads use managed isHome release when set',
    ],
    changed: [
      'Multi-platform downloads on the website',
      'Admin Releases control home + history',
    ],
    removed: ['Activation server URL field from Settings UI'],
  };

  await Release.findOneAndUpdate(
    { version: VERSION },
    { $set: payload },
    { upsert: true },
  );

  console.log('Seeded release', VERSION, 'isHome=true');
  console.log('Platforms:', platforms.map((p) => p.id).join(', '));
  await disconnectDB();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
