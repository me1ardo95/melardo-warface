-- Личные очки игроков (для рейтинга топ игроков)
alter table public.profiles
  add column if not exists points int default 0 not null;

