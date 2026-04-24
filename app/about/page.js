import Link from 'next/link';

export const metadata = {
  title: 'About',
  description:
    'HARSH TRUTH is a human-curated feed of posts worth preserving. No algorithm. Just curation.',
  alternates: { canonical: 'https://harshtruth.us/about' },
  openGraph: {
    title: 'About HARSH TRUTH',
    description: 'Human-curated, no algorithm.',
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
        <h1 className="about-title">No algorithm. Just curation.</h1>
        <p className="about-subtitle">
          A small feed of posts a human decided were worth keeping.
        </p>

        <section className="about-section">
          <h2>The idea</h2>
          <p>
            Most feeds are engagement machines — what surfaces is what keeps
            you scrolling, not what&rsquo;s worth reading. HARSH TRUTH is the
            opposite: posts show up here because a person looked at them and
            said &ldquo;this should be saved.&rdquo;
          </p>
          <p>
            Nothing goes on the feed automatically. Every item is reviewed,
            categorized, and published by hand.
          </p>
        </section>

        <hr className="about-rule" />

        <section className="about-section">
          <h2>How it works</h2>
          <ol>
            <li>
              Anyone with an account can submit a post URL (X or Twitter) along
              with a category and an optional note.
            </li>
            <li>
              Submissions land in a moderation queue where they&rsquo;re read
              and either approved or rejected.
            </li>
            <li>
              Approved posts appear on the public feed, filterable by category.
            </li>
          </ol>
        </section>

        <hr className="about-rule" />

        <section className="about-section">
          <h2>What we publish</h2>
          <p>
            We don&rsquo;t chase breaking news. Posts end up here because they
            make a point that holds up &mdash; a data point, a receipt, an
            argument, a piece of record worth referencing later. Categories
            cover what&rsquo;s actually being submitted, and that mix shifts
            over time.
          </p>
        </section>

        <hr className="about-rule" />

        <section className="about-section">
          <h2>Submit a post</h2>
          <p>
            Found something worth preserving? Sign in on the feed and hit
            &ldquo;Submit a Post.&rdquo; Paste the X/Twitter URL, pick a
            category, and leave a note explaining why it matters. It&rsquo;ll
            show up in the queue for review.
          </p>
          <Link href="/" className="about-cta">Back to the feed</Link>
        </section>
      </main>
    </>
  );
}
