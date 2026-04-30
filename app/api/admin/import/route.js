import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase';
import { getAdminUser } from '../../../../lib/admin-auth';
import { fetchTweetData } from '../../../../lib/twitter';

// POST /api/admin/import
//
// Admin-only one-shot importer used for bulk-adding bookmarked X posts
// directly into approved_posts (no submission row needed).
//
// Body:
//   { post_url: string, category: string }
//
// Behavior:
//   - 401 if not admin
//   - 400 if post_url is malformed or category is missing
//   - 422 if the tweet is unavailable (deleted / suspended / private) so
//     the caller can skip silently
//   - 200 { skipped: true } if a row with this post_url already exists
//   - 200 { success: true } on insert
//
// Mirrors the enrichment + progressive-payload pattern from
// app/api/admin/approve/route.js so newly-imported posts have text + media
// + metrics like normal approvals.

export async function POST(request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const postUrl = typeof body.post_url === 'string' ? body.post_url.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';

  if (!postUrl || !category) {
    return NextResponse.json(
      { error: 'post_url and category are required' },
      { status: 400 }
    );
  }

  const urlMatch = postUrl.match(/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/);
  if (!urlMatch) {
    return NextResponse.json(
      { error: 'post_url must look like https://x.com/<handle>/status/<id>' },
      { status: 400 }
    );
  }
  const handle = `@${urlMatch[1]}`;

  const supabase = createAdminClient();

  // Dedupe — skip if this URL was already imported / approved.
  const { data: existing } = await supabase
    .from('approved_posts')
    .select('id')
    .eq('post_url', postUrl)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'duplicate' });
  }

  const tweet = await fetchTweetData(postUrl);

  if (tweet.status === 'unavailable') {
    return NextResponse.json(
      { error: 'Tweet unavailable (deleted / suspended / private).' },
      { status: 422 }
    );
  }

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const now = new Date();
  const dateLabel = `${months[now.getMonth()]} ${now.getFullYear()}`;

  const baseInsert = {
    handle,
    post_url: postUrl,
    post_text: tweet.text || 'Imported from bookmarks.',
    category,
    date_label: dateLabel,
  };

  const fullPayload = {
    ...baseInsert,
    image_url: tweet.imageUrl || null,
    video_url: tweet.videoUrl || null,
    media_type: tweet.mediaType || null,
    like_count: typeof tweet.likeCount === 'number' ? tweet.likeCount : null,
    repost_count: typeof tweet.repostCount === 'number' ? tweet.repostCount : null,
    view_count: typeof tweet.viewCount === 'number' ? tweet.viewCount : null,
  };
  const attempts = [
    fullPayload,
    {
      ...baseInsert,
      image_url: tweet.imageUrl || null,
      like_count: typeof tweet.likeCount === 'number' ? tweet.likeCount : null,
      repost_count: typeof tweet.repostCount === 'number' ? tweet.repostCount : null,
      view_count: typeof tweet.viewCount === 'number' ? tweet.viewCount : null,
    },
    {
      ...baseInsert,
      image_url: tweet.imageUrl || null,
      like_count: typeof tweet.likeCount === 'number' ? tweet.likeCount : null,
    },
    { ...baseInsert, image_url: tweet.imageUrl || null },
    baseInsert,
  ];

  let insertError = null;
  for (const payload of attempts) {
    const res = await supabase.from('approved_posts').insert(payload);
    insertError = res.error;
    if (!insertError) break;
    if (!/column|schema cache/i.test(insertError.message || '')) break;
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
