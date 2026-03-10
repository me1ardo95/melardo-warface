-- Optional fields for tournaments: prize pool and description (used by admin create/edit)
alter table public.tournaments
  add column if not exists prize_pool int,
  add column if not exists description text;
