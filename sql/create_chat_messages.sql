create table if not exists public.chat_messages (
  id bigserial primary key,
  user_id uuid,
  member_id uuid,
  member_name text not null default '익명',
  message text not null check (char_length(message) <= 600),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy if not exists "chat_messages_select_all_authenticated"
  on public.chat_messages
  for select
  to authenticated
  using (true);

create policy if not exists "chat_messages_insert_authenticated"
  on public.chat_messages
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages(created_at desc);

alter publication supabase_realtime add table public.chat_messages;
