import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase';
import { getAdminUser } from '../../../../lib/admin-auth';
import { fetchTweetData } from '../../../../lib/twitter';

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

  // Pull text + media + metrics from Twitter's public oEmbed + syndication APIs.
  const tweet = await fetchTweetData(submission.post_url);

  if (tweet.status === 'unavailable') {
    return NextResponse.json(
      {
        error:
          "This X post is unavailable (deleted, suspended, or private). Reject the submission instead — it can't be imported.",
      },
      { status: 422 }
    );
  }

  const baseInsert = {
    handle,
    post_url: submission.post_url,
    post_text: tweet.text || submission.note || 'Post approved from submission.',
    category: submission.category,
    date_label: dateLabel,
  };

  // Try to insert with the richest payload we can. If the schema is missing
  // newer columns (mid-deploy), strip them progressively so approvals never
  // hard-fail just because a migration hasn't run yet.
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
    // Drop video columns if migration hasn't been applied yet
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
