-- PlanetPulse — Supabase schema
--
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- If you skip it the app still works, but it will keep data in the browser
-- (LocalStorage) and show "Local only" in the header.
--
-- Design notes:
--   * `co2_kg` is stored as a computed number, not recomputed on read. The
--     factors are a fixed part of the product's contract, and freezing the
--     result means a future factor change never rewrites history.
--   * `flagged` marks entries that tripped the sanity ceiling (DP2). They are
--     kept and shown, but excluded from totals — hence a column rather than a
--     delete.
--   * `settings` is a key/value table so the weekly target survives reloads
--     without needing a whole table for one number.

create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  type        text        not null,
  quantity    numeric     not null,
  co2_kg      numeric     not null,
  flagged     boolean     not null default false,
  created_at  timestamptz not null default now(),
  constraint activities_type_check check (type in ('car', 'bus', 'flight', 'electricity', 'veg_meal', 'nonveg_meal')),
  constraint activities_quantity_check check (quantity > 0),
  constraint activities_co2_check check (co2_kg >= 0)
);

-- The dashboard and history both read newest-first, and the weekly window
-- filters on created_at, so index it.
create index if not exists activities_created_at_idx
  on public.activities (created_at desc);

create index if not exists activities_type_created_at_idx
  on public.activities (type, created_at desc);

create table if not exists public.settings (
  key   text primary key,
  value text not null
);

-- Single-user demo: allow anonymous read/write through the anon key.
-- If you later add real auth, tighten these to `auth.uid() = user_id`.
alter table public.activities enable row level security;
alter table public.settings   enable row level security;

drop policy if exists "anon full access activities" on public.activities;
create policy "anon full access activities"
  on public.activities for all
  using (true) with check (true);

drop policy if exists "anon full access settings" on public.settings;
create policy "anon full access settings"
  on public.settings for all
  using (true) with check (true);
