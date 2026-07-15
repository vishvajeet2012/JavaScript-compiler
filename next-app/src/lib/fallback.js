/**
 * Fallback landing content when server is offline
 * Mirrors server getLandingContent shape
 */

/** Production Express API (Vercel) — used when NEXT_PUBLIC_API_URL is unset */
export const FALLBACK_API_URL = 'https://java-script-server.vercel.app';

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
    subtitle: 'Free desktop app for Windows. Auto-updates when a new release is published.',
    version: '1.0.0',
    // R2-backed download (see /api/download + R2_* env). Secrets stay in .env.local only.
    r2: {
      bucket: 'javascript',
      endpoint: 'https://0308caae65c4e6f5ca902d8fd0fbad41.r2.cloudflarestorage.com',
      accountId: '0308caae65c4e6f5ca902d8fd0fbad41',
      objectKey: 'releases/JS-Compiler-Setup-1.0.0.exe',
      filename: 'JS Compiler-Setup-1.0.0.exe',
    },
    platforms: [
      {
        id: 'windows',
        name: 'Windows',
        arch: 'x64',
        file: 'JS Compiler-Setup-1.0.0.exe',
        label: 'Download for Windows',
        // App-controlled download (IP rate limit + R2). Do not point to raw R2 public URL.
        href: '/api/download',
        note: 'NSIS installer · Auto-update enabled',
      },
      {
        id: 'releases',
        name: 'All releases',
        arch: '',
        file: '',
        label: 'GitHub Releases',
        href: 'https://github.com/vishvajeet2012/JavaScript-compiler/releases',
        note: 'Windows installer + Linux packages',
      },
    ],
    changelog: [
      {
        version: '1.0.0',
        date: '2026-07-13',
        items: [
          'Desktop JavaScript compiler with Monaco editor',
          'Folders, templates, local SQLite storage',
          'Pro activation with device limits & expiry',
          'Silent auto-update (Windows) via GitHub Releases',
          'Background usage analytics & crash reports',
          'System protection / remote kill-switch',
        ],
      },
    ],
    requirements: [
      'Windows 10/11 (64-bit)',
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
