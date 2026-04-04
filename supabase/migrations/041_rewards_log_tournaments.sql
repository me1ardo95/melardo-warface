-- Расширение rewards_log для турнирных наград

alter table public.rewards_log
  add column if not exists payload jsonb;

alter table public.rewards_log drop constraint if exists rewards_log_source_type_check;
alter table public.rewards_log
  add constraint rewards_log_source_type_check
  check (source_type in ('mission', 'season_level', 'tournament'));


