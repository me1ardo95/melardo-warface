-- scheduled_tournaments, оптимизация индексов

-- 1) Таблица запланированных турниров
create table if not exists public.scheduled_tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamptz not null,
  max_teams int not null default 16 check (max_teams in (8, 16, 32)),
  entry_fee int not null default 0,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'registration', 'running', 'completed')),
  tournament_id uuid references public.tournaments(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_scheduled_tournaments_start_time
  on public.scheduled_tournaments(start_time);
create index if not exists idx_scheduled_tournaments_status
  on public.scheduled_tournaments(status);

alter table public.scheduled_tournaments enable row level security;

create policy "Anyone can view scheduled_tournaments"
  on public.scheduled_tournaments for select
  using (true);

create policy "Admins can manage scheduled_tournaments"
  on public.scheduled_tournaments for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Service/cron needs to update: use service role (bypasses RLS) or add policy
create policy "Authenticated can update scheduled_tournaments"
  on public.scheduled_tournaments for update
  using (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- 2) Индексы для оптимизации
create index if not exists idx_profiles_points on public.profiles(points);
create index if not exists idx_teams_points on public.teams(points);
create index if not exists idx_matches_created_at on public.matches(created_at);
