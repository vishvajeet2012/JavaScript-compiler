/**
 * Seed managed release v1.0.4 isHome + GitHub URLs + notes.
 * Usage: node scripts/seed-release-1.0.4.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const Release = require('../src/models/Release');

const VERSION = '1.0.4';
const GH =
  'https://github.com/vishvajeet2012/JavaScript-compiler/releases/download/v1.0.4';

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    arch: 'x64',
    label: 'Download for Windows',
    fileName: 'JS-Compiler-Setup-1.0.4.exe',
    downloadUrl: `${GH}/JS-Compiler-Setup-1.0.4.exe`,
    note: 'NSIS · Auto-update',
  },
  {
    id: 'linux',
    name: 'Linux',
    arch: 'x64 · AppImage',
    label: 'Download AppImage',
    fileName: 'JS-Compiler-1.0.4.AppImage',
    downloadUrl: `${GH}/JS-Compiler-1.0.4.AppImage`,
    note: 'Portable AppImage',
  },
  {
    id: 'linux-deb',
    name: 'Linux',
    arch: 'x64 · .deb',
    label: 'Download .deb',
    fileName: 'JS-Compiler-1.0.4.deb',
    downloadUrl: `${GH}/JS-Compiler-1.0.4.deb`,
    note: 'Debian / Ubuntu',
  },
  {
    id: 'mac-arm64',
    name: 'macOS',
    arch: 'Apple Silicon',
    label: 'Download for Mac (Apple Silicon)',
    fileName: 'JS-Compiler-1.0.4-arm64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.0.4-arm64.dmg`,
    note: 'DMG arm64',
  },
  {
    id: 'mac-x64',
    name: 'macOS',
    arch: 'Intel',
    label: 'Download for Mac (Intel)',
    fileName: 'JS-Compiler-1.0.4-x64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.0.4-x64.dmg`,
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
        title: 'JS Compiler v1.0.4',
        notes:
          'Node npm install sandbox, public changelog, Free vs Pro comparison.',
        isHome: true,
        isOutdated: false,
        isPublished: true,
        publishedAt: new Date(),
        platforms,
        changelog: [
          'npm install + require for Node Pro',
          'Public What’s New page',
          'Free vs Pro table on homepage',
        ],
        added: [
          'Node mode npm install bar (Pro)',
          'Real require() for installed npm modules',
          'Website What’s New (/changelog) and Docs (/docs)',
          'Home Free vs Pro comparison table',
        ],
        fixed: [],
        changed: ['Every release must update public changelog'],
        removed: [],
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
