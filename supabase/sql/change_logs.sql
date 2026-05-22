-- Server-side change history table for EoHeung
-- Run this once in Supabase SQL Editor.

create table if not exists public.change_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor text,
  action text not null,
  detail text,
  target_type text,
  target_id text
);

alter table public.change_logs enable row level security;

drop policy if exists "change_logs_select_authenticated" on public.change_logs;
create policy "change_logs_select_authenticated"
on public.change_logs
for select
to authenticated
using (true);

drop policy if exists "change_logs_insert_authenticated" on public.change_logs;
create policy "change_logs_insert_authenticated"
on public.change_logs
for insert
to authenticated
with check (true);

-- Optional: only allow authenticated users to delete logs when needed manually.
-- The app does not delete server logs by default.
