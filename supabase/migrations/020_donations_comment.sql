-- Payment comment for donations (used to determine player vs team)
alter table public.donations add column if not exists comment text;
