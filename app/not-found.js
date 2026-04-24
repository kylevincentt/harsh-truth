import Link from 'next/link';

export const metadata = {
  title: '404 — HARSH TRUTH',
};

export default function NotFound() {
  return (
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
  );
}
