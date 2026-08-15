/**
 * Seed managed release v1.1.1 isHome + GitHub URLs + notes.
 * Usage: node scripts/seed-release-1.1.1.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const Release = require('../src/models/Release');

const VERSION = '1.1.1';
const GH =
  'https://github.com/vishvajeet2012/JavaScript-compiler/releases/download/v1.1.1';

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    arch: 'x64',
    label: 'Download for Windows',
    fileName: 'JS-Compiler-Setup-1.1.1.exe',
    downloadUrl: `${GH}/JS-Compiler-Setup-1.1.1.exe`,
    note: 'NSIS · Auto-update',
  },
  {
    id: 'linux',
    name: 'Linux',
    arch: 'x64 · AppImage',
    label: 'Download AppImage',
    fileName: 'JS-Compiler-1.1.1.AppImage',
    downloadUrl: `${GH}/JS-Compiler-1.1.1.AppImage`,
    note: 'Portable AppImage',
  },
  {
    id: 'linux-deb',
    name: 'Linux',
    arch: 'x64 · .deb',
    label: 'Download .deb',
    fileName: 'JS-Compiler-1.1.1.deb',
    downloadUrl: `${GH}/JS-Compiler-1.1.1.deb`,
    note: 'Debian / Ubuntu',
  },
  {
    id: 'mac-arm64',
    name: 'macOS',
    arch: 'Apple Silicon',
    label: 'Download for Mac (Apple Silicon)',
    fileName: 'JS-Compiler-1.1.1-arm64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.1.1-arm64.dmg`,
    note: 'DMG arm64',
  },
  {
    id: 'mac-x64',
    name: 'macOS',
    arch: 'Intel',
    label: 'Download for Mac (Intel)',
    fileName: 'JS-Compiler-1.1.1-x64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.1.1-x64.dmg`,
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
        title: 'JS Compiler v1.1.1',
        notes:
          'npm install works again on Windows, and the npm bar accepts full commands.',
        isHome: true,
        isOutdated: false,
        isPublished: true,
        publishedAt: new Date(),
        platforms,
        changelog: [
          'npm install fixed on Windows',
          'npm bar accepts "npm i lodash" style input',
          'Multiple packages per install',
        ],
        added: ['Install multiple packages at once (lodash axios dayjs)'],
        fixed: [
          'npm install failing with "spawn EINVAL" on Windows',
          'npm uninstall failing the same way on Windows',
          '"Invalid package name" when typing npm i lodash or yarn add axios',
          'Node.js not found when the app launched with a trimmed PATH',
          'Clearer message when Node.js is genuinely not installed',
        ],
        changed: ['npm bar placeholder shows the accepted formats'],
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
