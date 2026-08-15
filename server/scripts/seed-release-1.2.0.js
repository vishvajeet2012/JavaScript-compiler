/**
 * Seed managed release v1.2.0 isHome + GitHub URLs + notes.
 * Usage: node scripts/seed-release-1.2.0.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/db');
const Release = require('../src/models/Release');

const VERSION = '1.2.0';
const GH =
  'https://github.com/vishvajeet2012/JavaScript-compiler/releases/download/v1.2.0';

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    arch: 'x64',
    label: 'Download for Windows',
    fileName: 'JS-Compiler-Setup-1.2.0.exe',
    downloadUrl: `${GH}/JS-Compiler-Setup-1.2.0.exe`,
    note: 'NSIS · Auto-update',
  },
  {
    id: 'linux',
    name: 'Linux',
    arch: 'x64 · AppImage',
    label: 'Download AppImage',
    fileName: 'JS-Compiler-1.2.0.AppImage',
    downloadUrl: `${GH}/JS-Compiler-1.2.0.AppImage`,
    note: 'Portable AppImage',
  },
  {
    id: 'linux-deb',
    name: 'Linux',
    arch: 'x64 · .deb',
    label: 'Download .deb',
    fileName: 'JS-Compiler-1.2.0.deb',
    downloadUrl: `${GH}/JS-Compiler-1.2.0.deb`,
    note: 'Debian / Ubuntu',
  },
  {
    id: 'mac-arm64',
    name: 'macOS',
    arch: 'Apple Silicon',
    label: 'Download for Mac (Apple Silicon)',
    fileName: 'JS-Compiler-1.2.0-arm64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.2.0-arm64.dmg`,
    note: 'DMG arm64',
  },
  {
    id: 'mac-x64',
    name: 'macOS',
    arch: 'Intel',
    label: 'Download for Mac (Intel)',
    fileName: 'JS-Compiler-1.2.0-x64.dmg',
    downloadUrl: `${GH}/JS-Compiler-1.2.0-x64.dmg`,
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
        title: 'JS Compiler v1.2.0',
        notes:
          '25 new templates for JavaScript, TypeScript, HTML+CSS and Node, plus an offline terminal.',
        isHome: true,
        isOutdated: false,
        isPublished: true,
        publishedAt: new Date(),
        platforms,
        changelog: [
          '38 templates across JavaScript, TypeScript, HTML+CSS and Node',
          'Terminal works offline (xterm bundled with the app)',
          'Better TypeScript support: rest and optional parameters',
        ],
        added: [
          '25 new templates: 7 JavaScript, 6 TypeScript, 6 HTML+CSS, 6 Node',
          'HTML+CSS templates with real styling (grid, flexbox, animation, theming)',
          'Node templates for fs, JSON storage, crypto, events and fetch',
        ],
        fixed: [
          'Terminal failing to load without an internet connection',
          'TypeScript rest parameters (...args: number[]) breaking Run',
          'TypeScript optional parameters (name?: string) breaking Run',
          'Object literals being mangled by the TypeScript type stripper',
          'Async template output being cut off before it printed',
        ],
        changed: [
          'xterm terminal library ships inside the app instead of a CDN',
        ],
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
