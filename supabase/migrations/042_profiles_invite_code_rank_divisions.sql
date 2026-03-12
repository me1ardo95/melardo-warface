-- Referral invite_code и заготовка под ранговые дивизионы

alter table public.profiles
  add column if not exists invite_code text unique,
  add column if not exists rank_division_id uuid references public.rank_divisions(id) on delete set null;

create table if not exists public.rank_divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  min_rating int not null,
  max_rating int,
  icon text
);

alter table public.rank_divisions enable row level security;

create policy "Anyone can view rank_divisions"
  on public.rank_divisions for select using (true);

