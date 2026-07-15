/**
 * API Service — Business logic layer
 * Keeps controllers thin by moving logic here
 */

/**
 * Get application info
 * @returns {Object} Application metadata
 */
const getAppInfo = () => {
  return {
    name: 'JS Compiler API',
    version: '1.0.0',
    description: 'Backend API for JS Compiler landing page and services',
    product: 'JS Compiler',
    author: 'Vishvajeet Shukla',
    endpoints: {
      health: 'GET /api/v1/health',
      info: 'GET /api/v1/info',
      landing: 'GET /api/v1/landing',
      contact: 'POST /api/v1/contact',
    },
  };
};

/**
 * Landing / home page content for next-app
 * Single source of truth so frontend stays in sync with backend
 * @returns {Object} Home page payload
 */
const getLandingContent = () => {
  return {
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
        'Free desktop app for Windows, Linux, and macOS. Latest GitHub release installers.',
      version: 'latest',
      platforms: [
        {
          id: 'windows',
          name: 'Windows',
          arch: 'x64',
          label: 'Download for Windows',
          href: '/api/download?platform=windows',
          note: 'NSIS installer · Auto-update enabled',
        },
        {
          id: 'linux',
          name: 'Linux',
          arch: 'x64 · AppImage',
          label: 'Download AppImage',
          href: '/api/download?platform=linux',
          note: 'Portable AppImage',
        },
        {
          id: 'linux-deb',
          name: 'Linux',
          arch: 'x64 · .deb',
          label: 'Download .deb',
          href: '/api/download?platform=linux-deb',
          note: 'Debian / Ubuntu package',
        },
        {
          id: 'mac-arm64',
          name: 'macOS',
          arch: 'Apple Silicon',
          label: 'Download for Mac (Apple Silicon)',
          href: '/api/download?platform=mac-arm64',
          note: 'DMG · arm64',
        },
        {
          id: 'mac-x64',
          name: 'macOS',
          arch: 'Intel',
          label: 'Download for Mac (Intel)',
          href: '/api/download?platform=mac-x64',
          note: 'DMG · x64',
        },
        {
          id: 'releases',
          name: 'All releases',
          arch: '',
          label: 'GitHub Releases',
          href: 'https://github.com/vishvajeet2012/JavaScript-compiler/releases',
          note: 'Windows · Linux · macOS',
        },
      ],
      changelog: [
        {
          version: 'latest',
          date: '',
          items: [
            'Windows, Linux, and macOS builds',
            'In-app auto-update via GitHub Releases',
            'Pro activation, folders, local DB',
          ],
        },
      ],
      requirements: [
        'Windows 10/11, Linux x64, or macOS 11+',
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
      subtitle: 'Questions about JS Compiler, Pro licenses, or custom builds? Drop a message.',
      email: 'hello@vishvajeet.dev',
    },
  };
};

/**
 * Process a contact form submission
 * In production, this would save to DB and/or send an email
 *
 * @param {Object} contactData - The contact form data
 * @param {string} contactData.name - Sender name
 * @param {string} contactData.email - Sender email
 * @param {string} contactData.message - Message body
 * @returns {Object} Processed contact data with metadata
 */
const processContactForm = async ({ name, email, message }) => {
  // TODO: Save to database
  // const contact = await ContactModel.create({ name, email, message });

  // TODO: Send notification email
  // await emailService.sendNotification({ name, email, message });

  const submission = {
    id: `contact_${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    message: message.trim(),
    submittedAt: new Date().toISOString(),
  };

  console.log(`[SERVICE] New contact submission: ${submission.id} from ${submission.email}`);

  return submission;
};

module.exports = {
  getAppInfo,
  getLandingContent,
  processContactForm,
};
