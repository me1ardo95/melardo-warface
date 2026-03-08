-- Очки команд и история изменений очков

alter table public.teams
  add column if not exists points int default 0 not null;

create table if not exists public.profile_points_history (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.profile_points_history enable row level security;

create policy "Profiles history read"
  on public.profile_points_history for select
  using (auth.role() = 'authenticated');

create table if not exists public.team_points_history (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  delta int not null,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.team_points_history enable row level security;

create policy "Teams history read"
  on public.team_points_history for select
  using (auth.role() = 'authenticated');

