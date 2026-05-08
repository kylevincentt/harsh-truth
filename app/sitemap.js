import { createAdminClient } from '../lib/supabase';

// We declare the sitemap dynamic so Next regenerates it on each request
// rather than caching at build time. The post list changes whenever a
// submission is approved, and we don't want a stale sitemap to lag.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SITE_URL = 'https://harshtruth.us';

export default async function sitemap() {
  const now = new Date().toISOString();

  // Static routes first.
  const entries = [
    { url: `${SITE_URL}/`,      lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Append every approved (non-soft-deleted, non-tombstoned) post so the
  // detail pages from PR #4 are crawlable. We mirror the `isUnavailable()`
  // filter from the home feed: posts with no media AND tombstone-ish text
  // are skipped. Service-role client bypasses RLS in one round-trip.
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('approved_posts')
      .select('id, post_text, image_url, video_url, removed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(2000); // upper bound — sitemap.xml hard limit is 50k entries

    if (!error && data) {
      for (const p of data) {
        if (p.removed_at) continue;
        if (!p.image_url && !p.video_url) {
          const t = (p.post_text || '').trim().toLowerCase();
          // Audit 2026-05-08 M1: keep this list IN SYNC with isUnavailable()
          // in app/page.js — otherwise the sitemap and home feed drift apart
          // and we expose URLs the home page hides ("post approved from
          // submission." was the missing case).
          if (
            !t ||
            t === '(unavailable)' ||
            t === 'unavailable' ||
            t === 'tweet unavailable' ||
            t === 'this post is unavailable' ||
            t === 'this tweet is unavailable' ||
            t === 'post approved from submission.' ||
            t.startsWith('this post is unavailable') ||
            t.startsWith('this tweet is unavailable')
          ) {
            continue;
          }
        }
        entries.push({
          url: `${SITE_URL}/post/${p.id}`,
          lastModified: p.created_at ? new Date(p.created_at).toISOString() : now,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch {
    // If the DB is unreachable, fall back to static entries — better a
    // partial sitemap than none. Don't throw; sitemap should never 500.
  }

  return entries;
}
