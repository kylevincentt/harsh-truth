'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div className="notfound-wrap">
      <div className="notfound-frame">
        <div className="notfound-code" aria-hidden>ERR</div>
        <div className="notfound-title">SOMETHING BROKE</div>
        <p className="notfound-text">
          We hit an unexpected error. The harsh truth is that software fails
          sometimes.
        </p>
        <div className="notfound-actions">
          <button className="notfound-btn" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="notfound-btn notfound-btn-secondary">
            Back to the feed
          </Link>
        </div>
      </div>
    </div>
  );
}
