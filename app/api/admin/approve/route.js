import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase';
import { getAdminUser } from '../../../../lib/admin-auth';

async function fetchTweetData(postUrl) {
  const tweetId = postUrl.match(/\/status\/(\d+)/)?.[1];
  if (!tweetId) return { text: null, imageUrl: null };

  let text = null;
  let imageUrl = null;
  let likeCount = null;
  let repostCount = null;
  let viewCount = null;

  // Fetch tweet text via Twitter oEmbed API (free, no auth required)
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(postUrl)}&omit_script=true`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      // Extract text from the <p> tag inside the blockquote
      const match = data.html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      if (match) {
        text = match[1]
          .replace(/<a[^>]*>[\s\S]*?<\/a>/g, '') // strip anchor tags
          .replace(/<[^>]+>/g, '')                  // strip remaining HTML
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      }
    }
  } catch (_) {}

  // Fetch image (and text fallback) via Twitter syndication API
  try {
    const token = ((Number(tweetId) / 1e15) * Math.PI)
      .toString(36)
      .replace(/(0+|\.)/g, '');
    const res = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      // Extract image URL
      if (data.photos?.length > 0) {
        imageUrl = data.photos[0].url;
      } else if (data.mediaDetails?.length > 0) {
        const photo = data.mediaDetails.find((m) => m.type === 'photo');
        if (photo) imageUrl = photo.media_url_https;
      }
      // Use syndication text as fallback if oEmbed didn't work
      if (!text && data.text) {
        text = data.text;
      }
      // Capture like count (favorite_count) from syndication payload
      if (typeof data.favorite_count === 'number') {
        likeCount = data.favorite_count;
      }
      // Repost (retweet) count: syndication sometimes exposes it on top-level or in stats.
      const maybeRetweet =
        (typeof data.retweet_count === 'number' && data.retweet_count) ||
        (typeof data.quote_count === 'number' && data.quote_count) ||
        (data.stats && typeof data.stats.retweet_count === 'number' && data.stats.retweet_count);
      if (typeof maybeRetweet === 'number') {
        repostCount = maybeRetweet;
      }
      // View count: only sometimes surfaced in newer responses.
      const maybeViews =
        (typeof data.view_count === 'number' && data.view_count) ||
        (typeof data.views_count === 'number' && data.views_count) ||
        (data.stats && typeof data.stats.view_count === 'number' && data.stats.view_count);
      if (typeof maybeViews === 'number') {
        viewCount = maybeViews;
      }
    }
  } catch (_) {}

  return { text, imageUrl, likeCount, repostCount, viewCount };
}

export async function POST(request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  const supabase = createAdminClient();

  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  // Extract handle from URL
  const urlMatch = submission.post_url.match(/(?:x\.com|twitter\.com)\/(\w+)\/status/);
  const handle = urlMatch ? `@${urlMatch[1]}` : '@unknown';

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const now = new Date();
  const dateLabel = `${months[now.getMonth()]} ${now.getFullYear()}`;

  // Fetch real tweet text, image, and like count
  const { text: tweetText, imageUrl, likeCount, repostCount, viewCount } = await fetchTweetData(submission.post_url);

  const baseInsert = {
    handle,
    post_url: submission.post_url,
    post_text: tweetText || submission.note || 'Post approved from submission.',
    category: submission.category,
    date_label: dateLabel,
  };

  // Insert into approved_posts. Gracefully degrade if any optional column
  // isn't in the schema yet (so approvals don't break mid-deploy).
  const fullPayload = {
    ...baseInsert,
    image_url: imageUrl || null,
    like_count: typeof likeCount === 'number' ? likeCount : null,
    repost_count: typeof repostCount === 'number' ? repostCount : null,
    view_count: typeof viewCount === 'number' ? viewCount : null,
  };
  let insertError = null;
  const attempts = [
    fullPayload,
    { ...baseInsert, image_url: imageUrl || null, like_count: typeof likeCount === 'number' ? likeCount : null },
    { ...baseInsert, image_url: imageUrl || null },
    baseInsert,
  ];
  for (const payload of attempts) {
    const res = await supabase.from('approved_posts').insert(payload);
    insertError = res.error;
    if (!insertError) break;
    // Only retry if a column is missing; bail on any other error
    if (!/column|schema cache/i.test(insertError.message || '')) break;
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabase
    .from('submissions')
    .update({ status: 'approved' })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
