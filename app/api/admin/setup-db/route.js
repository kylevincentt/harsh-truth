import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase';
import { getAdminUser } from '../../../../lib/admin-auth';

const SETUP_SQL = `
  create table if not exists categories (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    sort_order integer not null default 0,
    created_at timestamptz default now()
  );

  alter table categories enable row level security;

  do $$
  begin
    if not exists (
      select 1 from pg_policies
      where tablename = 'categories' and policyname = 'categories_public_read'
    ) then
      create policy "categories_public_read"
        on categories for select
        using (true);
    end if;
  end$$;

  insert into categories (name, sort_order) values
    ('Judiciary', 1),
    ('Media / Bias', 2),
    ('Immigration', 3),
    ('Election Integrity', 4),
    ('Economy', 5),
    ('Foreign Policy', 6),
    ('Crime Stats', 7),
    ('Other', 8)
  on conflict (name) do nothing;
`;

export async function POST() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase.rpc('exec_sql', { sql: SETUP_SQL }).catch(() => ({
    error: { message: 'exec_sql RPC not available' },
  }));

  if (error) {
    // exec_sql RPC may not exist — fall back to individual inserts
    // The table may already be created via Supabase dashboard; just seed categories
    const categories = [
      { name: 'Judiciary', sort_order: 1 },
      { name: 'Media / Bias', sort_order: 2 },
      { name: 'Immigration', sort_order: 3 },
      { name: 'Election Integrity', sort_order: 4 },
      { name: 'Economy', sort_order: 5 },
      { name: 'Foreign Policy', sort_order: 6 },
      { name: 'Crime Stats', sort_order: 7 },
      { name: 'Other', sort_order: 8 },
    ];

    const { error: insertError } = await supabase
      .from('categories')
      .upsert(categories, { onConflict: 'name' });

    if (insertError) {
      return NextResponse.json(
        { error: `Table missing and seed failed: ${insertError.message}. Run migration SQL in Supabase dashboard.` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, seeded: true });
  }

  return NextResponse.json({ ok: true, created: true });
}
