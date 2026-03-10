-- Хранение победителя турнира
-- Добавляет ссылку на команду-победителя в таблицу tournaments.

alter table public.tournaments
  add column if not exists winner_team_id uuid references public.teams(id) on delete set null;

