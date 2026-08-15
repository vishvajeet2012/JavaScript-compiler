/**
 * Seed managed release v1.1.2 isHome + GitHub URLs + notes.
 * Usage: node scripts/seed-release-1.1.2.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const Release = require('../src/models/Release');

const VERSION = '1.1.2';
const GH =
  'https://github.com/vishvajeet2012/JavaScript-compiler/releases/download/v1.1.2';

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    arch: 'x64',
    label: 'Download for Windows',
    fileName: 'JS-Compiler-Setup-1.1.2.exe',
    downloadUrl: `${GH}/JS-Compiler-Setup-1.1.2.exe`,
    note: 'NSIS · Auto-update',
  },
  {
    id: 'linux',
    name: 'Linux',
    arch: 'x64 · AppImage',
    label: 'Download AppImage',
    fileName: 'JS-Compiler-1.1.2.AppImage',
    downloadUrl: `${GH}/JS-Compiler-1.1.2.AppImage`,
    note: 'Portable AppImage',
  },
  {
    id: 'linux-deb',
    name: 'Linux',
    arch: 'x64 · .deb',
    label: 'Download .deb',
    fileName: 'JS-Compiler-1.1.2.deb',
    downloadUrl: `${GH}/JS-Compiler-1.1.2.deb`,
    note: 'Debian / Ubuntu',
  },
  {
    id: 'mac-arm64',
    name: 'macOS',
    arch: 'Apple Silicon',
    label: 'Download for Mac (Apple Silicon)',
    fileName: 'JS-Compiler-1.1.2-arm64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.1.2-arm64.dmg`,
    note: 'DMG arm64',
  },
  {
    id: 'mac-x64',
    name: 'macOS',
    arch: 'Intel',
    label: 'Download for Mac (Intel)',
    fileName: 'JS-Compiler-1.1.2-x64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.1.2-x64.dmg`,
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
        title: 'JS Compiler v1.1.2',
        notes:
          'New tabs keep the language you selected instead of resetting to JavaScript.',
        isHome: true,
        isOutdated: false,
        isPublished: true,
        publishedAt: new Date(),
        platforms,
        changelog: [
          'New tabs keep the selected language (Node stays Node)',
          'npm bar stays open when you add a Node file',
        ],
        added: [],
        fixed: [
          'Language dropdown resetting to JavaScript when creating a new file',
          'npm bar disappearing on a new tab while working in Node mode',
        ],
        changed: [],
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
