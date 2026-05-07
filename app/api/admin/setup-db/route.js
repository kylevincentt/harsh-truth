import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase';
import { getAdminUser } from '../../../../lib/admin-auth';

// Seed list reflects the post-2026-05-07 category restructure. If the DB is
// re-initialised from scratch, these are the categories that should exist.
// (Pre-existing prod databases get migrated by 20260507_category_restructure.sql.)
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
    ('Immigration', 1),
    ('Crime & Courts', 2),
    ('Media', 3),
    ('Schools', 4),
    ('Gender Ideology', 5),
    ('Islam', 6),
    ('Decline', 7),
    ('Democrats', 8),
    ('Rigged', 9),
    ('Other', 99)
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
    const categories = [
      { name: 'Immigration', sort_order: 1 },
      { name: 'Crime & Courts', sort_order: 2 },
      { name: 'Media', sort_order: 3 },
      { name: 'Schools', sort_order: 4 },
      { name: 'Gender Ideology', sort_order: 5 },
      { name: 'Islam', sort_order: 6 },
      { name: 'Decline', sort_order: 7 },
      { name: 'Democrats', sort_order: 8 },
      { name: 'Rigged', sort_order: 9 },
      { name: 'Other', sort_order: 99 },
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
