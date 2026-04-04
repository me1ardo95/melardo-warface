-- Формат турнира (Single Elimination, Round Robin и т.д.)
alter table public.tournaments
  add column if not exists format text;

