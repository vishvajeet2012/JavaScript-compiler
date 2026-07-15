/**
 * Site search index for command palette (Ctrl/⌘ + K)
 */

export const SITE_SEARCH_ITEMS = [
  {
    id: 'home',
    title: 'Home',
    desc: 'Hero & overview',
    href: '/#home',
    keywords: 'home start top hero',
    group: 'Page',
  },
  {
    id: 'download',
    title: 'Download',
    desc: 'Windows · Linux · macOS installers',
    href: '/#download',
    keywords: 'download install exe app windows linux mac',
    group: 'Page',
  },
  {
    id: 'compare',
    title: 'Free vs Pro',
    desc: 'Feature comparison table',
    href: '/#compare',
    keywords: 'free pro compare plan features typescript node',
    group: 'Page',
  },
  {
    id: 'pricing',
    title: 'Pricing',
    desc: 'Trial, Student, Pro, Team keys',
    href: '/#pricing',
    keywords: 'price buy key license student team trial',
    group: 'Page',
  },
  {
    id: 'features',
    title: 'Features',
    desc: 'What the desktop app can do',
    href: '/#features',
    keywords: 'features run save offline',
    group: 'Page',
  },
  {
    id: 'about',
    title: 'About',
    desc: 'About JS Compiler',
    href: '/#about',
    keywords: 'about product',
    group: 'Page',
  },
  {
    id: 'contact',
    title: 'Contact',
    desc: 'Send a message',
    href: '/#contact',
    keywords: 'contact email support',
    group: 'Page',
  },
  {
    id: 'changelog',
    title: 'What’s New / Changelog',
    desc: 'Public release notes',
    href: '/changelog',
    keywords: 'changelog whats new release notes version fixed added',
    group: 'Docs',
  },
  {
    id: 'docs',
    title: 'Docs hub',
    desc: 'Documentation links',
    href: '/docs',
    keywords: 'docs documentation help',
    group: 'Docs',
  },
  {
    id: 'releases',
    title: 'Installer history',
    desc: 'Older / outdated builds',
    href: '/releases',
    keywords: 'releases history old version installer',
    group: 'Docs',
  },
  {
    id: 'jsplay',
    title: 'JS Play',
    desc: 'Online JavaScript playground',
    href: '/jsplay',
    keywords: 'play playground online run browser',
    group: 'Tools',
  },
  {
    id: 'github',
    title: 'GitHub Releases',
    desc: 'All published installers',
    href: 'https://github.com/vishvajeet2012/JavaScript-compiler/releases',
    keywords: 'github release download source',
    group: 'External',
    external: true,
  },
];

export function searchSite(query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return SITE_SEARCH_ITEMS.slice(0, 8);
  return SITE_SEARCH_ITEMS.filter((item) => {
    const hay = `${item.title} ${item.desc} ${item.keywords}`.toLowerCase();
    return hay.includes(q) || q.split(/\s+/).every((w) => hay.includes(w));
  }).slice(0, 12);
}
