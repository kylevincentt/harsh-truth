import './globals.css';
import ThemeLoader from './ThemeLoader';

const SITE_URL = 'https://harshtruth.us';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'HARSH TRUTH',
    template: '%s · HARSH TRUTH',
  },
  description: 'A human-curated feed of posts worth preserving. No algorithm. Just curation.',
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
    description: 'A human-curated feed of posts worth preserving. No algorithm. Just curation.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HARSH TRUTH',
    description: 'A human-curated feed of posts worth preserving. No algorithm. Just curation.',
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
      </head>
      <body>
        <a href="#feed" className="skip-link">Skip to feed</a>
        <ThemeLoader />
        {children}
      </body>
    </html>
  );
}
