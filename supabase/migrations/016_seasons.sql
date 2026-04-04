-- Сезоны и архив сезонных результатов

create table if not exists public.seasons (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  is_active boolean not null default false
);

alter table public.seasons enable row level security;

create policy "Anyone can view seasons"
  on public.seasons for select
  using (true);

create policy "Admins can manage seasons"
  on public.seasons for all
  using (auth.role() = 'authenticated');

create table if not exists public.season_archive (
  id uuid primary key default extensions.uuid_generate_v4(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  final_rank int not null,
  final_points int not null,
  stats jsonb,
  created_at timestamptz not null default now()
);

alter table public.season_archive enable row level security;

create policy "Anyone can view season archive"
  on public.season_archive for select
  using (true);

create index if not exists idx_season_archive_season
  on public.season_archive(season_id);

create index if not exists idx_season_archive_team
  on public.season_archive(team_id);



