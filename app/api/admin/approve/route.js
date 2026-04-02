import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase';
import { getAdminUser } from '../../../../lib/admin-auth';

async function fetchTweetData(postUrl) {
  const tweetId = postUrl.match(/\/status\/(\d+)/)?.[1];
  if (!tweetId) return { text: null, imageUrl: null };

  let text = null;
  let imageUrl = null;

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
    }
  } catch (_) {}

  return { text, imageUrl };
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

  // Fetch real tweet text and image
  const { text: tweetText, imageUrl } = await fetchTweetData(submission.post_url);

  const baseInsert = {
    handle,
    post_url: submission.post_url,
    post_text: tweetText || submission.note || 'Post approved from submission.',
    category: submission.category,
    date_label: dateLabel,
  };

  // Insert into approved_posts (with image_url if available)
  let { error: insertError } = await supabase.from('approved_posts').insert({
    ...baseInsert,
    image_url: imageUrl || null,
  });

  // If image_url column doesn't exist yet, retry without it
  if (insertError?.message?.includes('image_url')) {
    ({ error: insertError } = await supabase.from('approved_posts').insert(baseInsert));
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
