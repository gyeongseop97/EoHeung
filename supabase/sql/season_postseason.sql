-- Run once in Supabase SQL Editor before the next schedule sync.
-- Existing rows stay unclassified until the official sync updates their TYPE.
begin;
alter table public.games
  add column if not exists season_type text check (season_type in ('REGULAR','PRESEASON','POSTSEASON','UNKNOWN')),
  add column if not exists postseason_round text check (postseason_round in ('WC','준PO','PO','KS')),
  add column if not exists game_number integer check (game_number > 0);
alter table public.kbo_all_games
  add column if not exists season_type text check (season_type in ('REGULAR','PRESEASON','POSTSEASON','UNKNOWN')),
  add column if not exists postseason_round text check (postseason_round in ('WC','준PO','PO','KS')),
  add column if not exists game_number integer check (game_number > 0);
create index if not exists games_season_date_idx on public.games (season_type, game_date);
create index if not exists kbo_all_games_season_date_idx on public.kbo_all_games (season_type, game_date);
notify pgrst, 'reload schema';
commit;
