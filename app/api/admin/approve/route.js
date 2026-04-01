import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase';

export async function POST(request) {
  const password = request.headers.get('x-admin-password');

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  const supabase = createAdminClient();

  // Get the submission
  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  // Extract handle from URL or use a placeholder
  const urlMatch = submission.post_url.match(/(?:x\.com|twitter\.com)\/(\w+)\/status/);
  const handle = urlMatch ? `@${urlMatch[1]}` : '@unknown';

  // Create the date label
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const now = new Date();
  const dateLabel = `${months[now.getMonth()]} ${now.getFullYear()}`;

  // Insert into approved_posts
  const { error: insertError } = await supabase.from('approved_posts').insert({
    handle,
    post_url: submission.post_url,
    post_text: submission.note || 'Post approved from submission.',
    category: submission.category,
    date_label: dateLabel,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update submission status
  await supabase
    .from('submissions')
    .update({ status: 'approved' })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
