import Link from 'next/link';

export const metadata = {
  title: 'About',
  description:
    'HARSH TRUTH — the receipts, organized. The country-killing truths kept where you can find them.',
  alternates: { canonical: 'https://harshtruth.us/about' },
  openGraph: {
    title: 'About HARSH TRUTH',
    description: 'The receipts, organized.',
    url: 'https://harshtruth.us/about',
  },
};

export default function AboutPage() {
  return (
    <>
      <header className="header" role="banner">
        <Link href="/" className="header-brand" aria-label="HARSH TRUTH — home">
          <span className="header-title">HARSH TRUTH</span>
          <span className="header-tagline">&ldquo;No algorithm. Just curation.&rdquo;</span>
        </Link>
        <nav className="header-right" aria-label="Primary">
          <Link href="/" className="header-nav-link">Feed</Link>
        </nav>
      </header>

      <main className="about-wrap">
        <div className="about-eyebrow">About</div>
        <h1 className="about-title">The receipts, organized.</h1>
        <p className="about-subtitle">
          The most important, country-killing truths &mdash; kept where you can find them.
        </p>

        <section className="about-section">
          <h2>Why this exists</h2>
          <p>
            The truth doesn&rsquo;t travel well. The outlets your friends and
            family actually watch won&rsquo;t touch the stories that matter
            most. The posts that do break through on X scroll past in a day and
            disappear.
          </p>
          <p>
            This is where those stories get kept &mdash; pulled off X, sorted
            by category, waiting for the next time you need them.
          </p>
        </section>

        <hr className="about-rule" />

        <section className="about-section">
          <h2>Who this is for</h2>
          <p>
            Anyone who&rsquo;s tried to have an honest conversation with a
            liberal coworker, a skeptical friend, or a boomer parent who gets
            their news from cable &mdash; and walked away thinking,{' '}
            <em>I know there was a story about this, I just can&rsquo;t
            remember where.</em>
          </p>
          <p>
            HARSH TRUTH is where you go back. Evidence, at hand. Receipts,
            organized.
          </p>
        </section>

        <hr className="about-rule" />

        <section className="about-section">
          <h2>What&rsquo;s here</h2>
          <p>
            Not breaking news. Not hot takes. The harsh truths that actually
            shape the country &mdash; filed by category, so you can go find
            the one you need.
          </p>
        </section>

        <hr className="about-rule" />

        <section className="about-section">
          <h2>Contribute</h2>
          <p>
            Saw something on X that&rsquo;s too important to let vanish? Send
            it in.
          </p>
          <Link href="/" className="about-cta">Back to the feed</Link>
        </section>
      </main>
    </>
  );
}
