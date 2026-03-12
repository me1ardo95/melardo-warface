-- Автоматическая турнирная система (FACEIT-подобная)
-- Добавляет нормализованные таблицы: tournament_teams, tournament_brackets, tournament_rewards
-- и расширяет public.tournaments полями type/status/format/max_teams/current_teams/start_time.

-- 1) Расширение tournaments под ТЗ
alter table public.tournaments
  add column if not exists type text,
  add column if not exists max_teams int,
  add column if not exists current_teams int not null default 0,
  add column if not exists start_time timestamptz;

-- format уже добавлялся в 010_tournaments_format.sql, но на всякий случай:
alter table public.tournaments
  add column if not exists format text;

-- Статусы/форматы/типы: расширяем допустимые значения, не ломая старые данные
alter table public.tournaments drop constraint if exists tournaments_status_check;
alter table public.tournaments
  add constraint tournaments_status_check
  check (status in (
    -- legacy
    'upcoming','ongoing','completed','cancelled',
    -- new (ТЗ)
    'registration','starting','active','finished'
  ));

alter table public.tournaments drop constraint if exists tournaments_type_check;
alter table public.tournaments
  add constraint tournaments_type_check
  check (type is null or type in ('daily','weekly','monthly','clan'));

alter table public.tournaments drop constraint if exists tournaments_format_check;
alter table public.tournaments
  add constraint tournaments_format_check
  check (format is null or format in ('single_elimination','double_elimination','round_robin'));

-- Подтягиваем start_time из legacy start_date (если новое поле ещё пустое)
update public.tournaments
set start_time = start_date
where start_time is null and start_date is not null;

-- 2) tournament_teams (вместо tournament_registrations)
create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed int,
  status text not null default 'active' check (status in ('active','disqualified')),
  created_at timestamptz default now() not null,
  unique (tournament_id, team_id)
);

create index if not exists idx_tournament_teams_tournament_id
  on public.tournament_teams(tournament_id);
create index if not exists idx_tournament_teams_team_id
  on public.tournament_teams(team_id);

alter table public.tournament_teams enable row level security;

create policy "Anyone can view tournament_teams"
  on public.tournament_teams for select
  using (true);

create policy "Authenticated can insert tournament_teams"
  on public.tournament_teams for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can manage tournament_teams"
  on public.tournament_teams for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Мягкая миграция: копируем registrations → tournament_teams (если таблица registrations есть)
insert into public.tournament_teams (tournament_id, team_id, created_at)
select tr.tournament_id, tr.team_id, tr.created_at
from public.tournament_registrations tr
on conflict (tournament_id, team_id) do nothing;

-- 3) tournament_brackets
create table if not exists public.tournament_brackets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round text not null check (round in ('1','2','3','semi_final','final')),
  match_number int not null,
  team1_id uuid references public.teams(id) on delete set null,
  team2_id uuid references public.teams(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  winner_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_tournament_brackets_tournament_round
  on public.tournament_brackets(tournament_id, round, match_number);
create index if not exists idx_tournament_brackets_match_id
  on public.tournament_brackets(match_id);

alter table public.tournament_brackets enable row level security;

create policy "Anyone can view tournament_brackets"
  on public.tournament_brackets for select
  using (true);

create policy "Admins can manage tournament_brackets"
  on public.tournament_brackets for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4) tournament_rewards
create table if not exists public.tournament_rewards (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  place int not null check (place between 1 and 3),
  rating_reward int not null default 0,
  xp_reward int not null default 0,
  created_at timestamptz not null default now(),
  primary key (tournament_id, place)
);

create index if not exists idx_tournament_rewards_tournament_id
  on public.tournament_rewards(tournament_id);

alter table public.tournament_rewards enable row level security;

create policy "Anyone can view tournament_rewards"
  on public.tournament_rewards for select
  using (true);

create policy "Admins can manage tournament_rewards"
  on public.tournament_rewards for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

