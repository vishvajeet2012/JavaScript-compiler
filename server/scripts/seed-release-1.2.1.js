/**
 * Seed managed release v1.2.1 isHome + GitHub URLs + notes.
 * Usage: node scripts/seed-release-1.2.1.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const Release = require('../src/models/Release');

const VERSION = '1.2.1';
const GH =
  'https://github.com/vishvajeet2012/JavaScript-compiler/releases/download/v1.2.1';

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    arch: 'x64',
    label: 'Download for Windows',
    fileName: 'JS-Compiler-Setup-1.2.1.exe',
    downloadUrl: `${GH}/JS-Compiler-Setup-1.2.1.exe`,
    note: 'NSIS · Auto-update',
  },
  {
    id: 'linux',
    name: 'Linux',
    arch: 'x64 · AppImage',
    label: 'Download AppImage',
    fileName: 'JS-Compiler-1.2.1.AppImage',
    downloadUrl: `${GH}/JS-Compiler-1.2.1.AppImage`,
    note: 'Portable AppImage',
  },
  {
    id: 'linux-deb',
    name: 'Linux',
    arch: 'x64 · .deb',
    label: 'Download .deb',
    fileName: 'JS-Compiler-1.2.1.deb',
    downloadUrl: `${GH}/JS-Compiler-1.2.1.deb`,
    note: 'Debian / Ubuntu',
  },
  {
    id: 'mac-arm64',
    name: 'macOS',
    arch: 'Apple Silicon',
    label: 'Download for Mac (Apple Silicon)',
    fileName: 'JS-Compiler-1.2.1-arm64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.2.1-arm64.dmg`,
    note: 'DMG arm64',
  },
  {
    id: 'mac-x64',
    name: 'macOS',
    arch: 'Intel',
    label: 'Download for Mac (Intel)',
    fileName: 'JS-Compiler-1.2.1-x64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.2.1-x64.dmg`,
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
        title: 'JS Compiler v1.2.1',
        notes:
          'Clicking into a file gives the editor focus again, so you can just type.',
        isHome: true,
        isOutdated: false,
        isPublished: true,
        publishedAt: new Date(),
        platforms,
        changelog: [
          'Click into a file and type — no more picking a file first',
          'Editor re-measures itself when a tab is activated',
        ],
        added: [],
        fixed: [
          'Typing doing nothing until you selected a file in the sidebar or clicked Save',
          'Editor rendering no lines when a tab was activated before layout',
          'Blank editor with no explanation when it could not be downloaded',
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
