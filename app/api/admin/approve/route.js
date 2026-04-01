import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase';

async function getAdminUser() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return profile?.is_admin ? user : null;
}

export async function POST(request) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  const admin = createAdminClient();

  const { data: submission, error: fetchError } = await admin
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

  const { error: insertError } = await admin.from('approved_posts').insert({
    handle,
    post_url: submission.post_url,
    post_text: submission.note || 'Post approved from submission.',
    category: submission.category,
    date_label: dateLabel,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await admin
    .from('submissions')
    .update({ status: 'approved' })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
