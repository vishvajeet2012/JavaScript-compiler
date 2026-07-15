/**
 * Fallback landing content when server is offline
 * Mirrors server getLandingContent shape
 */

/** Production Express API (Vercel) — used when NEXT_PUBLIC_API_URL is unset */
export const FALLBACK_API_URL = 'https://java-script-server.vercel.app';

/**
 * Hardcoded promo fallback if API offline.
 * Keys must also exist in Mongo (run server/scripts/generate-promo-keys.js).
 * Popup shows until showUntil (~2 months). License valid until keyExpiresAt.
 */
export const FALLBACK_PROMO = {
  active: true,
  code: 'WEB_FREE_2M',
  title: 'Free Pro key — limited launch promo',
  message:
    'Activate JS Compiler Pro free until 1 January 2028. Copy the key, open the desktop app → Activate Pro, and paste it. Offer shown here for 2 months.',
  keyExpiresAt: '2028-01-01T00:00:00.000Z',
  showUntil: '2026-09-15T00:00:00.000Z',
  /** Synced with Mongo WEB_FREE_2M promo (generate-promo-keys.js) */
  sampleKey: 'PROMO-BR6X-W3CH-24MV',
  keys: [
    'PROMO-BR6X-W3CH-24MV',
    'PROMO-YR26-RK5W-UR4X',
    'PROMO-2QDB-HAXV-DURD',
    'PROMO-RBZX-23ZH-ULNM',
    'PROMO-YXBX-RNQ4-ZTTT',
    'PROMO-6NTH-JBTU-Z552',
    'PROMO-VCJC-VGW9-HG7A',
    'PROMO-PPKD-U9YQ-6P4N',
    'PROMO-KGVP-URU2-NLG5',
    'PROMO-85TN-7JEG-CANF',
    'PROMO-947S-B6AG-L3JZ',
    'PROMO-T4TB-KGP4-KAFN',
  ],
};

export const FALLBACK_LANDING = {
  brand: {
    name: 'JS Compiler',
    logo: 'JS',
    tagline: 'Desktop JavaScript Compiler',
  },
  hero: {
    badge: 'Desktop App · Free & Pro',
    titleLine: 'Write. Run. Save.',
    titleHighlight: 'JavaScript',
    subtitle:
      'A fast desktop JavaScript compiler with folders, templates, local DB, and Pro activation. Code offline — ship faster.',
    primaryCta: { label: 'Download for Windows', href: '#download' },
    secondaryCta: { label: 'Buy Pro key', href: '#pricing' },
  },
  download: {
    title: 'Download JS Compiler',
    subtitle:
      'Free desktop app for Windows, Linux, and macOS. Installers always resolve to the latest GitHub release.',
    version: 'latest',
    platforms: [
      {
        id: 'windows',
        name: 'Windows',
        arch: 'x64',
        file: 'JS-Compiler-Setup-latest.exe',
        label: 'Download for Windows',
        href: '/api/download?platform=windows',
        note: 'NSIS installer · Auto-update enabled',
      },
      {
        id: 'linux',
        name: 'Linux',
        arch: 'x64 · AppImage',
        file: 'JS-Compiler-latest.AppImage',
        label: 'Download AppImage',
        href: '/api/download?platform=linux',
        note: 'Portable AppImage · chmod +x then run',
      },
      {
        id: 'linux-deb',
        name: 'Linux',
        arch: 'x64 · .deb',
        file: 'JS-Compiler-latest.deb',
        label: 'Download .deb',
        href: '/api/download?platform=linux-deb',
        note: 'Debian / Ubuntu package',
      },
      {
        id: 'mac-arm64',
        name: 'macOS',
        arch: 'Apple Silicon (M1/M2/M3)',
        file: 'JS-Compiler-arm64.dmg',
        label: 'Download for Mac (Apple Silicon)',
        href: '/api/download?platform=mac-arm64',
        note: 'DMG installer · arm64',
      },
      {
        id: 'mac-x64',
        name: 'macOS',
        arch: 'Intel',
        file: 'JS-Compiler-x64.dmg',
        label: 'Download for Mac (Intel)',
        href: '/api/download?platform=mac-x64',
        note: 'DMG installer · x64',
      },
      {
        id: 'releases',
        name: 'All releases',
        arch: '',
        file: '',
        label: 'GitHub Releases',
        href: 'https://github.com/vishvajeet2012/JavaScript-compiler/releases',
        note: 'Windows · Linux · macOS archives',
      },
    ],
    changelog: [
      {
        version: 'latest',
        date: '',
        items: [
          'Desktop JavaScript compiler with Monaco editor',
          'Windows, Linux (AppImage/deb), macOS (Intel + Apple Silicon)',
          'Folders, templates, local SQLite storage',
          'Pro activation with device limits & expiry',
          'In-app auto-update via GitHub Releases',
        ],
      },
    ],
    requirements: [
      'Windows 10/11 (64-bit), or Linux x64, or macOS 11+',
      'Internet only for activation & updates',
      'Works fully offline for coding',
    ],
  },
  features: [
    {
      icon: '⚡',
      title: 'Instant Run',
      description:
        'Write and execute JavaScript, TypeScript, HTML+JS, and Node-style snippets.',
    },
    {
      icon: '📁',
      title: 'Folders & Templates',
      description:
        'Organize snippets into folders and reuse multi-language templates.',
    },
    {
      icon: '💾',
      title: 'Local Database',
      description:
        'Your code stays on your machine with SQLite-backed local storage.',
    },
    {
      icon: '🕘',
      title: 'Version History (Pro)',
      description:
        'Automatic snapshots on save — restore any previous version when Pro is active.',
    },
    {
      icon: '🔑',
      title: 'Pro · Student · Team',
      description:
        'Trial, student (college ID), multi-device plans, and coaching batch licenses.',
    },
    {
      icon: '🔒',
      title: 'Privacy First',
      description:
        'No cloud lock-in. Snippets and projects remain under your control.',
    },
  ],
  stats: [
    { value: '1-Click', label: 'Run JS Code' },
    { value: 'Offline', label: 'Works Without Internet' },
    { value: 'Local DB', label: 'Snippets Saved Safely' },
    { value: 'Pro', label: 'Activation Ready' },
  ],
  about: {
    title: 'About JS Compiler',
    paragraphs: [
      'JS Compiler is a desktop app for writing, running, and saving JavaScript snippets. Built for students, freelancers, and developers who want a focused coding workspace without browser tabs or cloud accounts.',
      'The stack includes Electron for the desktop shell, a local SQLite database for snippets, and a production Express API powering this landing page — contact, health, and product content.',
    ],
    techStack: [
      'Electron',
      'JavaScript',
      'Node.js',
      'Express',
      'Next.js',
      'React',
      'SQLite',
      'better-sqlite3',
    ],
  },
  contact: {
    title: "Let's Talk",
    subtitle:
      'Questions about JS Compiler, Pro licenses, or custom builds? Drop a message.',
    email: 'hello@vishvajeet.dev',
  },
};
