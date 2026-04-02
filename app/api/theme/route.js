import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('themes')
    .select('colors')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'No active theme found' }, { status: 404 });
  }

  return NextResponse.json(data.colors, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
