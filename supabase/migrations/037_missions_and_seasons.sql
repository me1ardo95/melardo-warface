-- Система миссий и сезонов (уровня FACEIT)
-- Удержание игроков, долгосрочная прогрессия

-- 1) Используем существующую таблицу seasons (id, name, start_date, end_date, is_active)

-- 2) missions — шаблоны миссий
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('daily', 'weekly', 'seasonal')),
  period_key text not null,
  objective_type text not null check (objective_type in (
    'play_matches', 'win_matches', 'win_streak', 'play_different_maps'
  )),
  objective_value int not null default 1,
  reward_xp int not null default 0,
  reward_rating int not null default 0,
  season_id uuid references public.seasons(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_missions_type_period on public.missions(type, period_key);
create index if not exists idx_missions_season on public.missions(season_id) where season_id is not null;

alter table public.missions enable row level security;

create policy "Anyone can view missions"
  on public.missions for select using (true);

-- 3) player_missions — прогресс игрока по миссиям
create table if not exists public.player_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  progress int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, mission_id)
);

create index if not exists idx_player_missions_user on public.player_missions(user_id);
create index if not exists idx_player_missions_mission on public.player_missions(mission_id);

alter table public.player_missions enable row level security;

create policy "Users can view own player_missions"
  on public.player_missions for select using (auth.uid() = user_id);

-- 4) rewards_log — лог наград
create table if not exists public.rewards_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('mission', 'season_level')),
  source_id uuid,
  xp_delta int not null default 0,
  rating_delta int not null default 0,
  season_points_delta int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_rewards_log_user on public.rewards_log(user_id);

alter table public.rewards_log enable row level security;

create policy "Users can view own rewards_log"
  on public.rewards_log for select using (auth.uid() = user_id);

-- 5) season_progress — прогресс игрока в сезоне
create table if not exists public.season_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  xp int not null default 0,
  level int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, season_id)
);

create index if not exists idx_season_progress_user on public.season_progress(user_id);
create index if not exists idx_season_progress_season on public.season_progress(season_id);

alter table public.season_progress enable row level security;

create policy "Anyone can view season_progress"
  on public.season_progress for select using (true);

-- 6) season_levels — уровни Season Pass
create table if not exists public.season_levels (
  id uuid primary key default gen_random_uuid(),
  level int not null,
  xp_required int not null,
  reward jsonb,
  season_id uuid references public.seasons(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(season_id, level)
);

create index if not exists idx_season_levels_season on public.season_levels(season_id);

alter table public.season_levels enable row level security;

create policy "Anyone can view season_levels"
  on public.season_levels for select using (true);

-- 7) player_win_streaks — для трекинга win_streak (кеш на конец сессии)
create table if not exists public.player_win_streaks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  current_streak int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

alter table public.player_win_streaks enable row level security;

-- 8) player_maps_played — для play_different_maps (уникальные карты за период)
create table if not exists public.player_maps_played (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  map_name text not null,
  period_key text not null,
  mission_type text not null,
  created_at timestamptz not null default now(),
  unique(user_id, map_name, period_key, mission_type)
);

create index if not exists idx_player_maps_user_period on public.player_maps_played(user_id, period_key, mission_type);

alter table public.player_maps_played enable row level security;

