/**
 * Fallback landing content when server is offline
 * Mirrors server getLandingContent shape
 */
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
    secondaryCta: { label: 'Explore Features', href: '#features' },
  },
  download: {
    title: 'Download JS Compiler',
    subtitle: 'Free desktop app for Windows. Auto-updates when a new release is published.',
    version: '1.0.0',
    platforms: [
      {
        id: 'windows',
        name: 'Windows',
        arch: 'x64',
        file: 'JS Compiler-Setup-1.0.0.exe',
        label: 'Download for Windows',
        href: 'https://github.com/vishvajeet2012/JavaScript-compiler/releases/latest/download/JS%20Compiler-Setup-1.0.0.exe',
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
        'Write and execute JavaScript snippets instantly with a clean desktop UI.',
    },
    {
      icon: '📁',
      title: 'Folders & Templates',
      description:
        'Organize snippets into folders and reuse templates for everyday tasks.',
    },
    {
      icon: '💾',
      title: 'Local Database',
      description:
        'Your code stays on your machine with SQLite-backed local storage.',
    },
    {
      icon: '🔑',
      title: 'Pro Activation',
      description:
        'Unlock Pro features with secure machine-bound license activation.',
    },
    {
      icon: '🔒',
      title: 'Privacy First',
      description:
        'No cloud lock-in. Snippets and projects remain under your control.',
    },
    {
      icon: '🖥️',
      title: 'Cross Platform',
      description:
        'Built with Electron for a smooth native experience on desktop.',
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
