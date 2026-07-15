/**
 * /jsplay — SEO + JSON-LD for the online JavaScript playground
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://jsplay-kappa.vercel.app';
const PAGE_URL = `${SITE_URL.replace(/\/$/, '')}/jsplay`;

export const metadata = {
  title: 'JS Play | Free Online JavaScript Playground',
  description:
    'Write and run JavaScript online with infinite-loop auto-pause, local save, and a clean console. Free browser playground from JS Compiler — no login required.',
  keywords: [
    'JavaScript playground',
    'online JS editor',
    'run JavaScript online',
    'JS Play',
    'infinite loop protection',
    'browser code runner',
    'JS Compiler',
    'free JavaScript IDE',
  ],
  authors: [{ name: 'Vishvajeet Shukla' }],
  creator: 'Vishvajeet Shukla',
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: 'JS Play | Free Online JavaScript Playground',
    description:
      'Run JavaScript in the browser with auto-pause for infinite loops. Code saved locally — refresh-safe. From the JS Compiler team.',
    url: PAGE_URL,
    siteName: 'JS Compiler',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: `${SITE_URL.replace(/\/$/, '')}/js-compiler-icon.png`,
        width: 512,
        height: 512,
        alt: 'JS Compiler logo — JS Play online playground',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'JS Play | Free Online JavaScript Playground',
    description:
      'Write and run JavaScript online. Infinite loops auto-pause. Code stays in localStorage.',
    images: [`${SITE_URL.replace(/\/$/, '')}/js-compiler-icon.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${PAGE_URL}#app`,
      name: 'JS Play',
      alternateName: 'JS Compiler Online Playground',
      url: PAGE_URL,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'Free online JavaScript playground with console output, infinite-loop auto-pause, and localStorage persistence so your code survives page refresh.',
      featureList: [
        'Run JavaScript in the browser',
        'Infinite loop auto-pause (timeout)',
        'Console output',
        'localStorage code persistence',
        'No login required',
      ],
      screenshot: `${SITE_URL.replace(/\/$/, '')}/js-compiler-icon.png`,
      image: `${SITE_URL.replace(/\/$/, '')}/js-compiler-icon.png`,
      isPartOf: {
        '@type': 'WebSite',
        name: 'JS Compiler',
        url: SITE_URL.replace(/\/$/, ''),
      },
      author: {
        '@type': 'Person',
        name: 'Vishvajeet Shukla',
        url: 'https://vishvajeetshukla.in',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'JS Compiler',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Windows, macOS, Linux',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      url: `${SITE_URL.replace(/\/$/, '')}/#download`,
      description:
        'Desktop JavaScript compiler with offline snippets, folders, and Pro activation.',
      image: `${SITE_URL.replace(/\/$/, '')}/js-compiler-icon.png`,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL.replace(/\/$/, ''),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'JS Play',
          item: PAGE_URL,
        },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is JS Play free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. JS Play is a free online JavaScript playground with no login required.',
          },
        },
        {
          '@type': 'Question',
          name: 'What happens if my code has an infinite loop?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Execution auto-pauses after the configured timeout (default 5 seconds), similar to the desktop JS Compiler, so the browser UI stays responsive.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is my code saved if I refresh the page?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Your current editor code is stored in the browser localStorage and restored automatically after refresh.',
          },
        },
      ],
    },
  ],
};

export default function JsPlayLayout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
