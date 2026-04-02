import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase';
import { getAdminUser } from '../../../../lib/admin-auth';

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

  const urlMatch = submission.post_url.match(/(?:x\.com|twitter\.com)\/(\w+)\/status/);
  const handle = urlMatch ? `@${urlMatch[1]}` : '@unknown';

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const now = new Date();
  const dateLabel = `${months[now.getMonth()]} ${now.getFullYear()}`;

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

  await supabase
    .from('submissions')
    .update({ status: 'approved' })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
