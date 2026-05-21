-- Samsung Lions Watch Party Manager - Supabase Schema
-- 실행 위치: Supabase Dashboard > SQL Editor > New query

create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text,
  phone text,
  favorite_player text,
  status text not null default 'active' check (status in ('active', 'dormant')),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  source_key text unique,
  game_date date not null,
  game_time time,
  opponent text not null,
  home_away text not null default 'HOME' check (home_away in ('HOME', 'AWAY', 'NEUTRAL')),
  stadium text,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'FINISHED', 'POSTPONED', 'CANCELLED')),
  samsung_score int,
  opponent_score int,
  result text check (result in ('W', 'L', 'D')),
  ticket_url text,
  memo text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kbo_all_games (
  id uuid primary key default gen_random_uuid(),
  source_key text unique,
  game_date date not null,
  game_time time,
  away_team text not null,
  home_team text not null,
  stadium text,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'FINISHED', 'POSTPONED', 'CANCELLED')),
  away_score int,
  home_score int,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_members (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  planned boolean not null default false,
  attended boolean not null default false,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_members_unique unique (game_id, member_id)
);

create table if not exists public.quick_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at before update on public.members for each row execute function public.set_updated_at();

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at before update on public.games for each row execute function public.set_updated_at();

drop trigger if exists kbo_all_games_set_updated_at on public.kbo_all_games;
create trigger kbo_all_games_set_updated_at before update on public.kbo_all_games for each row execute function public.set_updated_at();

drop trigger if exists game_members_set_updated_at on public.game_members;
create trigger game_members_set_updated_at before update on public.game_members for each row execute function public.set_updated_at();

drop trigger if exists quick_links_set_updated_at on public.quick_links;
create trigger quick_links_set_updated_at before update on public.quick_links for each row execute function public.set_updated_at();

insert into public.quick_links (title, url, description, sort_order)
values
  ('삼성 라이온즈 공식 홈페이지', 'https://www.samsunglions.com/', '구단 소식, 선수단, 경기 정보', 1),
  ('KBO 경기일정/결과', 'https://www.koreabaseball.com/Schedule/Schedule.aspx', 'KBO 공식 일정/결과', 2),
  ('KBO 영문 Daily Schedule', 'https://eng.koreabaseball.com/Schedule/DailySchedule.aspx', '텍스트 기반 일정 확인용', 3),
  ('티켓링크', 'https://www.ticketlink.co.kr/sports/baseball', '예매 바로가기', 4)
on conflict do nothing;

alter table public.members enable row level security;
alter table public.games enable row level security;
alter table public.kbo_all_games enable row level security;
alter table public.game_members enable row level security;
alter table public.quick_links enable row level security;

DROP POLICY IF EXISTS "authenticated read members" ON public.members;
DROP POLICY IF EXISTS "authenticated insert members" ON public.members;
DROP POLICY IF EXISTS "authenticated update members" ON public.members;
DROP POLICY IF EXISTS "authenticated delete members" ON public.members;
DROP POLICY IF EXISTS "authenticated read games" ON public.games;
DROP POLICY IF EXISTS "authenticated insert games" ON public.games;
DROP POLICY IF EXISTS "authenticated update games" ON public.games;
DROP POLICY IF EXISTS "authenticated delete games" ON public.games;
DROP POLICY IF EXISTS "authenticated read kbo_all_games" ON public.kbo_all_games;
DROP POLICY IF EXISTS "authenticated insert kbo_all_games" ON public.kbo_all_games;
DROP POLICY IF EXISTS "authenticated update kbo_all_games" ON public.kbo_all_games;
DROP POLICY IF EXISTS "authenticated delete kbo_all_games" ON public.kbo_all_games;
DROP POLICY IF EXISTS "authenticated read game_members" ON public.game_members;
DROP POLICY IF EXISTS "authenticated insert game_members" ON public.game_members;
DROP POLICY IF EXISTS "authenticated update game_members" ON public.game_members;
DROP POLICY IF EXISTS "authenticated delete game_members" ON public.game_members;
DROP POLICY IF EXISTS "authenticated read quick_links" ON public.quick_links;
DROP POLICY IF EXISTS "authenticated insert quick_links" ON public.quick_links;
DROP POLICY IF EXISTS "authenticated update quick_links" ON public.quick_links;
DROP POLICY IF EXISTS "authenticated delete quick_links" ON public.quick_links;

create policy "authenticated read members" on public.members for select to authenticated using (true);
create policy "authenticated insert members" on public.members for insert to authenticated with check (true);
create policy "authenticated update members" on public.members for update to authenticated using (true) with check (true);
create policy "authenticated delete members" on public.members for delete to authenticated using (true);

create policy "authenticated read games" on public.games for select to authenticated using (true);
create policy "authenticated insert games" on public.games for insert to authenticated with check (true);
create policy "authenticated update games" on public.games for update to authenticated using (true) with check (true);
create policy "authenticated delete games" on public.games for delete to authenticated using (true);

create policy "authenticated read kbo_all_games" on public.kbo_all_games for select to authenticated using (true);
create policy "authenticated insert kbo_all_games" on public.kbo_all_games for insert to authenticated with check (true);
create policy "authenticated update kbo_all_games" on public.kbo_all_games for update to authenticated using (true) with check (true);
create policy "authenticated delete kbo_all_games" on public.kbo_all_games for delete to authenticated using (true);

create policy "authenticated read game_members" on public.game_members for select to authenticated using (true);
create policy "authenticated insert game_members" on public.game_members for insert to authenticated with check (true);
create policy "authenticated update game_members" on public.game_members for update to authenticated using (true) with check (true);
create policy "authenticated delete game_members" on public.game_members for delete to authenticated using (true);

create policy "authenticated read quick_links" on public.quick_links for select to authenticated using (true);
create policy "authenticated insert quick_links" on public.quick_links for insert to authenticated with check (true);
create policy "authenticated update quick_links" on public.quick_links for update to authenticated using (true) with check (true);
create policy "authenticated delete quick_links" on public.quick_links for delete to authenticated using (true);
