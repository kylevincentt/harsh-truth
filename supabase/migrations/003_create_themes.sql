-- Create themes table
create table if not exists themes (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  is_active boolean not null default false,
  colors jsonb not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table themes enable row level security;

-- Allow public reads (frontend needs to load active theme without auth)
create policy "themes_public_read"
  on themes for select
  using (true);

-- Seed with two themes
insert into themes (name, is_active, colors) values
  (
    'Original Dark',
    false,
    '{"bg": "#0a0a0a", "bg-card": "#111111", "bg-card-hover": "#1a1a1a", "text": "#f2ede6", "text-muted": "#8a8478", "red": "#c0392b", "gold": "#c9a84c", "border": "#222222"}'
  ),
  (
    'Warm Earth',
    true,
    '{"bg": "#1c1814", "bg-card": "#242018", "bg-card-hover": "#2c2620", "text": "#e8dcc8", "text-muted": "#8a7a66", "red": "#c47a3a", "gold": "#c9943a", "border": "#342e28"}'
  )
on conflict (name) do nothing;
