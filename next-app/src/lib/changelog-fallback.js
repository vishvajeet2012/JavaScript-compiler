/**
 * Static fallback when Admin/API has no release notes yet.
 * Agents MUST update this on every desktop release (see root AGENTS.md § Changelog).
 */

export const CHANGELOG_FALLBACK = [
  {
    version: '1.0.4',
    title: 'JS Compiler v1.0.4',
    publishedAt: '2026-07-15',
    isHome: true,
    notes: 'Node npm install sandbox, public changelog & Free vs Pro table.',
    added: [
      'Node mode npm install bar (Pro) — packages in local sandbox',
      'Real require() for installed npm modules',
      'Website What’s New (/changelog) and Docs (/docs)',
      'Home Free vs Pro comparison table',
    ],
    fixed: [],
    changed: [
      'Every release must update public changelog (agent rule)',
    ],
    removed: [],
    changelog: [
      'npm install + require for Node Pro',
      'Public What’s New page',
      'Free vs Pro table on homepage',
    ],
  },
  {
    version: '1.0.3',
    title: 'JS Compiler v1.0.3',
    publishedAt: '2026-07-15',
    isHome: false,
    notes: 'Promo key activation fix, Free vs Pro language lock, trial cleanup.',
    added: [],
    fixed: [
      'PROMO- keys no longer rejected as invalid (hyphen formatting)',
      'Free plan blocked from TypeScript, HTML+JS, Node run/save',
      'Promo claim CORS on website',
    ],
    changed: [
      'Only one free 7-day trial plan (TRIAL_7D)',
      'Trial remains free (₹0)',
    ],
    removed: ['Duplicate ONETIME 7-day trial plan'],
    changelog: [
      'Promo keys activate correctly',
      'TS / HTML / Node Pro-only on Free',
      'Single free 7-day trial plan',
    ],
  },
  {
    version: '1.0.2',
    title: 'JS Compiler v1.0.2',
    publishedAt: '2026-07-15',
    isHome: false,
    notes: 'Admin banner, What’s New, update notes, website promo.',
    added: [
      'Admin broadcast banner in the desktop app',
      'Structured update notes (Added / Fixed / Changed / Removed)',
      'In-app What’s New',
      'Website free Pro promo popup',
    ],
    fixed: [
      'Activation server no longer editable as localhost',
      'Clearer update-check errors',
    ],
    changed: ['Multi-platform downloads on the website'],
    removed: ['Activation server URL field from Settings UI'],
    changelog: [],
  },
  {
    version: '1.0.1',
    title: 'JS Compiler v1.0.1',
    publishedAt: '2026-07-15',
    isHome: false,
    notes: 'Production activation lock, multi-OS downloads, update UX.',
    added: ['Multi-platform website downloads', 'Improved auto-update messaging'],
    fixed: ['Production activation server defaults'],
    changed: [],
    removed: [],
    changelog: [],
  },
];
