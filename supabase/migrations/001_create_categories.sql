-- Create categories table
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table categories enable row level security;

-- Allow public reads (sidebar needs this without auth)
create policy "categories_public_read"
  on categories for select
  using (true);

-- Seed initial categories
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
