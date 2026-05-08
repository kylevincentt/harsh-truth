import Link from 'next/link';

export const metadata = {
  // Audit 2026-05-08 M3: opt out of the layout's "%s · HARSH TRUTH"
  // template so the title isn't doubled ("404 — HARSH TRUTH · HARSH TRUTH").
  title: { absolute: '404 — HARSH TRUTH' },
};

export default function NotFound() {
  return (
    <>
      {/* Audit 2026-05-08 M2: surface the standard site header on the
          404 so a visitor hitting a stale share link can navigate out
          rather than facing a single back-button. */}
      <header className="header" role="banner">
        <Link href="/" className="header-brand" aria-label="HARSH TRUTH — home">
          <span className="header-title">HARSH TRUTH</span>
          <span className="header-tagline">&ldquo;The receipts, organized.&rdquo;</span>
        </Link>
        <nav className="header-right" aria-label="Primary">
          <Link href="/" className="header-nav-link">Feed</Link>
          <Link href="/about" className="header-nav-link">About</Link>
        </nav>
      </header>

      <div className="notfound-wrap">
        <div className="notfound-frame">
          <div className="notfound-code">404</div>
          <div className="notfound-title">NOT FOUND</div>
          <p className="notfound-text">
            This page doesn&rsquo;t exist &mdash; or it wasn&rsquo;t worth
            preserving.
          </p>
          <Link href="/" className="notfound-btn">
            Back to the feed
          </Link>
        </div>
      </div>
    </>
  );
}
