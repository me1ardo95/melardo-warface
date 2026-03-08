-- Дополнительные поля для турниров: ограничение по командам и данные сетки

alter table public.tournaments
  add column if not exists max_teams int,
  add column if not exists bracket_data jsonb;

