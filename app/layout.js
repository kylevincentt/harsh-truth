import './globals.css';
import './mobile-fixes.css';
import './audit-fixes.css';
import ThemeLoader from './ThemeLoader';

const SITE_URL = 'https://harshtruth.us';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'HARSH TRUTH',
    template: '%s · HARSH TRUTH',
  },
  description: 'The receipts, organized. A human-curated feed of harsh truths worth preserving.',
  applicationName: 'HARSH TRUTH',
  keywords: ['curation', 'news', 'commentary', 'curated feed', 'no algorithm'],
  authors: [{ name: 'HARSH TRUTH' }],
  creator: 'HARSH TRUTH',
  publisher: 'HARSH TRUTH',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'HARSH TRUTH',
    title: 'HARSH TRUTH',
    description: 'The receipts, organized. A human-curated feed of harsh truths worth preserving.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HARSH TRUTH',
    description: 'The receipts, organized. A human-curated feed of harsh truths worth preserving.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: 'news',
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport = {
  themeColor: '#1c1814',
  width: 'device-width',
  initialScale: 1,
  // Allow user zoom for accessibility; don't lock at 1.0
  maximumScale: 5,
};

// Audit R3 2026-05-09 M4: explicit 'auto' so the browser preserves the
// prior page's scroll on back-button. force-dynamic detail pages were
// sometimes landing at scrollTop=0 after history.back() instead of
// returning to the related-strip the user was just looking at.
const SCROLL_RESTORATION_INIT = `
  if ('scrollRestoration' in history) {
    try { history.scrollRestoration = 'auto'; } catch (e) {}
  }
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{ __html: SCROLL_RESTORATION_INIT }}
        />
      </head>
      <body>
        <a href="#feed" className="skip-link">Skip to feed</a>
        <ThemeLoader />
        {children}
      </body>
    </html>
  );
}
