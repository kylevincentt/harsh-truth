import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase';
import './post-detail.css';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://harshtruth.us';

async function fetchPost(id) {
  // Service-role client returns the row in one round-trip without RLS
  // surprises. The route is read-only — no privileged actions happen here.
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('approved_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  // Don't surface removed posts (audit C1 soft-delete trail).
  if (data.removed_at) return null;
  // Don't surface tombstoned posts (X import couldn't reach the original).
  // Mirrors isUnavailable() in app/page.js.
  const t = (data.post_text || '').trim().toLowerCase();
  const isTombstone =
    !data.image_url &&
    !data.video_url &&
    (t === '(unavailable)' ||
      t === 'unavailable' ||
      t.startsWith('this post is unavailable') ||
      t.startsWith('this tweet is unavailable'));
  if (isTombstone) return null;
  return data;
}

export async function generateMetadata({ params }) {
  const post = await fetchPost(params.id);
  if (!post) {
    return {
      title: 'Post not found',
      robots: { index: false, follow: false },
    };
  }
  const blurb = (post.post_text || '').slice(0, 160).trim();
  const title = `${post.handle || 'Post'} — ${post.category || 'HARSH TRUTH'}`;
  const url = `${SITE_URL}/post/${post.id}`;
  return {
    title,
    description: blurb || 'A receipt, preserved on HARSH TRUTH.',
    alternates: { canonical: url },
    openGraph: {
      title,
      description: blurb || 'A receipt, preserved on HARSH TRUTH.',
      url,
      type: 'article',
      images: post.image_url ? [{ url: post.image_url }] : undefined,
    },
    twitter: {
      card: post.image_url ? 'summary_large_image' : 'summary',
      title,
      description: blurb || 'A receipt, preserved on HARSH TRUTH.',
    },
  };
}

function formatCount(n) {
  if (typeof n !== 'number' || !isFinite(n)) return null;
  if (n < 1000) return n.toLocaleString();
  if (n < 1_000_000) {
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')) + 'K';
  }
  const v = n / 1_000_000;
  return (v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')) + 'M';
}

export default async function PostPage({ params }) {
  const post = await fetchPost(params.id);
  if (!post) notFound();

  const reposts = formatCount(post.repost_count);
  const likes = formatCount(post.like_count);
  const views = formatCount(post.view_count);
  const hasMetrics = reposts || likes || views;

  return (
    <>
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

      <main className="post-detail-wrap">
        <nav className="post-detail-crumbs" aria-label="Breadcrumb">
          <Link href="/" className="post-detail-crumb-link">Feed</Link>
          <span className="post-detail-crumb-sep" aria-hidden="true">›</span>
          <Link
            href={`/?cat=${encodeURIComponent(post.category || '')}`}
            className="post-detail-crumb-link"
          >
            {post.category}
          </Link>
        </nav>

        <article className="post-detail-card">
          <div className="post-card-header">
            <span className="post-handle">{post.handle}</span>
            <span className="post-category">{post.category}</span>
            <span className="post-date">{post.date_label}</span>
          </div>

          {post.post_text && (
            <div className="post-text is-expanded">{post.post_text}</div>
          )}

          {post.video_url ? (
            <video
              className="post-media post-video"
              controls
              playsInline
              preload="metadata"
              poster={post.image_url || undefined}
            >
              <source
                src={`/api/video?url=${encodeURIComponent(post.video_url)}`}
                type="video/mp4"
              />
              {post.post_url && (
                <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                  View video on X
                </a>
              )}
            </video>
          ) : post.image_url ? (
            <img
              src={post.image_url}
              alt={`Image attached to post by ${post.handle || 'unknown'}`}
              className="post-media post-image"
              loading="lazy"
              decoding="async"
            />
          ) : null}

          {hasMetrics && (
            <div className="post-metrics" aria-label="Post metrics from X">
              {reposts && <span className="post-metric">{reposts} reposts</span>}
              {likes && <span className="post-metric">{likes} likes</span>}
              {views && <span className="post-metric">{views} views</span>}
            </div>
          )}

          <div className="post-footer">
            <Link href="/" className="post-link">
              <span className="post-arrow" aria-hidden="true">&larr;</span> Back to feed
            </Link>
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="post-link"
              >
                View on X <span className="post-arrow" aria-hidden="true">&rarr;</span>
              </a>
            )}
          </div>
        </article>
      </main>
    </>
  );
}
