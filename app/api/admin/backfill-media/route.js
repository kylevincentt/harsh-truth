import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase';
import { getAdminUser } from '../../../../lib/admin-auth';
import { fetchTweetData, postTextLooksUnavailable } from '../../../../lib/twitter';

// POST /api/admin/backfill-media
//
// Body (all optional):
//   { ids?: string[],            // backfill only these approved_posts.id values
//     handles?: string[],        // backfill posts whose handle is in this list (e.g. ['@Breaking911'])
//     onlyMissingMedia?: boolean // default true — skip posts that already have video_url or image_url
//     limit?: number             // default 50, max 200
//   }
//
// Re-fetches each tweet via the public oEmbed + syndication APIs and updates
// post_text / image_url / video_url / media_type / metrics. Posts whose tweet
// is gone (deleted, suspended, private) are flagged by *removing* their
// (unavailable)-style post_text — the frontend already filters those out.
//
// Returns a per-post status report so the admin can see what happened.

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

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : null;
  const handles = Array.isArray(body.handles)
    ? body.handles.filter(Boolean).map((h) => (h.startsWith('@') ? h : `@${h}`))
    : null;
  const onlyMissingMedia = body.onlyMissingMedia !== false; // default true
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);

  const supabase = createAdminClient();

  let query = supabase.from('approved_posts').select('*');
  if (ids && ids.length) query = query.in('id', ids);
  if (handles && handles.length) query = query.in('handle', handles);
  query = query.order('created_at', { ascending: false }).limit(limit);

  const { data: posts, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!posts || posts.length === 0) {
    return NextResponse.json({ updated: 0, skipped: 0, results: [] });
  }

  const results = [];
  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    const hasMedia = Boolean(post.image_url || post.video_url);
    const looksDead = postTextLooksUnavailable(post.post_text);

    if (onlyMissingMedia && hasMedia && !looksDead) {
      skipped++;
      results.push({ id: post.id, handle: post.handle, status: 'skipped' });
      continue;
    }

    const tweet = await fetchTweetData(post.post_url);

    if (tweet.status === 'unavailable') {
      // Mark post body as unavailable so the frontend filter hides it.
      // We still keep the row (admin can later delete it from the queue UI).
      const update = { post_text: '(unavailable)' };
      const res = await supabase
        .from('approved_posts')
        .update(update)
        .eq('id', post.id);
      if (res.error) {
        results.push({ id: post.id, handle: post.handle, status: 'error', error: res.error.message });
      } else {
        results.push({ id: post.id, handle: post.handle, status: 'unavailable' });
      }
      continue;
    }

    if (tweet.status !== 'ok') {
      results.push({ id: post.id, handle: post.handle, status: 'fetch_failed' });
      continue;
    }

    // Build update payload — only set columns where we actually got new data,
    // so we don't clobber human edits on text or earlier-fetched media.
    const update = {};
    if (tweet.text && (!post.post_text || looksDead)) update.post_text = tweet.text;
    if (tweet.imageUrl) update.image_url = tweet.imageUrl;
    if (tweet.videoUrl) update.video_url = tweet.videoUrl;
    if (tweet.mediaType) update.media_type = tweet.mediaType;
    if (typeof tweet.likeCount === 'number') update.like_count = tweet.likeCount;
    if (typeof tweet.repostCount === 'number') update.repost_count = tweet.repostCount;
    if (typeof tweet.viewCount === 'number') update.view_count = tweet.viewCount;

    if (Object.keys(update).length === 0) {
      results.push({ id: post.id, handle: post.handle, status: 'no_change' });
      continue;
    }

    // Try the full update; if a column is missing (migration not yet run),
    // strip the unknown columns and retry.
    const attempts = [
      update,
      stripKeys(update, ['video_url', 'media_type']),
      stripKeys(update, ['video_url', 'media_type', 'view_count', 'repost_count']),
      stripKeys(update, ['video_url', 'media_type', 'view_count', 'repost_count', 'like_count']),
    ];

    let updateError = null;
    let applied = null;
    for (const payload of attempts) {
      if (Object.keys(payload).length === 0) continue;
      const res = await supabase
        .from('approved_posts')
        .update(payload)
        .eq('id', post.id);
      updateError = res.error;
      if (!updateError) {
        applied = payload;
        break;
      }
      if (!/column|schema cache/i.test(updateError.message || '')) break;
    }

    if (updateError) {
      results.push({
        id: post.id,
        handle: post.handle,
        status: 'error',
        error: updateError.message,
      });
    } else {
      updated++;
      results.push({
        id: post.id,
        handle: post.handle,
        status: 'updated',
        fields: Object.keys(applied || {}),
      });
    }
  }

  return NextResponse.json({ updated, skipped, total: posts.length, results });
}

function stripKeys(obj, keys) {
  const next = { ...obj };
  for (const k of keys) delete next[k];
  return next;
}
