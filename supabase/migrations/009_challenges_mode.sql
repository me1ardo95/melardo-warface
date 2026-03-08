-- Режим вызова (5x5 / 8x8)
alter table public.challenges
  add column if not exists mode text;
