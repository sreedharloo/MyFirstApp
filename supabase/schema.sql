-- Minimal schema for Personal Time Tracker

-- Categories
create table if not exists public.categories (
  id text primary key,
  name text not null,
  color text not null
);

-- Entries
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  date text not null, -- YYYY-MM-DD
  start integer not null, -- minutes from 00:00
  "end" integer not null,
  category text not null references public.categories(id) on delete restrict,
  label text,
  created_at timestamp with time zone default now()
);

-- Helpful index for range queries
create index if not exists entries_date_idx on public.entries(date);

-- Optional: seed a few categories
insert into public.categories(id,name,color) values
  ('work','Work','#58c4ff'),
  ('exercise','Exercise','#60db95'),
  ('break','Break','#ffb86b'),
  ('personal','Personal','#d7a6ff'),
  ('sleep','Sleep','#8892ff'),
  ('other','Other','#ffd166')
on conflict (id) do nothing;

