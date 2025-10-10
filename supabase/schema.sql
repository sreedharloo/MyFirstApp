-- Minimal schema for Personal Time Tracker

-- Ensure UUID generator is available
create extension if not exists pgcrypto;

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

-- Row Level Security (RLS) policies for anon access (MVP)
alter table public.categories enable row level security;
alter table public.entries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='anon select categories') then
    create policy "anon select categories" on public.categories for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='anon insert categories') then
    create policy "anon insert categories" on public.categories for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='anon update categories') then
    create policy "anon update categories" on public.categories for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='anon delete categories') then
    create policy "anon delete categories" on public.categories for delete using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='entries' and policyname='anon select entries') then
    create policy "anon select entries" on public.entries for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='entries' and policyname='anon insert entries') then
    create policy "anon insert entries" on public.entries for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='entries' and policyname='anon update entries') then
    create policy "anon update entries" on public.entries for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='entries' and policyname='anon delete entries') then
    create policy "anon delete entries" on public.entries for delete using (true);
  end if;
end $$;
