-- Anti Smurf, Trust Score, Screenshot Validation, Auto Resolved

-- 1) trust_score в profiles (users)
alter table public.profiles
  add column if not exists trust_score int default 80 check (trust_score >= 0 and trust_score <= 100);

-- 2) smurf_flags
create table if not exists public.smurf_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  confidence_score numeric(5,2) not null default 0 check (confidence_score >= 0 and confidence_score <= 100),
  status text not null default 'suspected' check (status in ('suspected', 'confirmed', 'dismissed')),
  created_at timestamptz default now() not null
);

create index if not exists idx_smurf_flags_user_id on public.smurf_flags(user_id);
create index if not exists idx_smurf_flags_status on public.smurf_flags(status);

alter table public.smurf_flags enable row level security;

create policy "Admins can view smurf_flags"
  on public.smurf_flags for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Service can insert smurf_flags"
  on public.smurf_flags for insert with check (true);

create policy "Admins can update smurf_flags"
  on public.smurf_flags for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 3) user_sessions (для IP, User-Agent, Device fingerprint)
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_hash text,
  user_agent_hash text,
  device_fingerprint text,
  created_at timestamptz default now() not null
);

create index if not exists idx_user_sessions_user_id on public.user_sessions(user_id);
create index if not exists idx_user_sessions_ip_hash on public.user_sessions(ip_hash);
create index if not exists idx_user_sessions_device_fingerprint on public.user_sessions(device_fingerprint);

alter table public.user_sessions enable row level security;

create policy "Admins can view user_sessions"
  on public.user_sessions for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Authenticated can insert user_sessions"
  on public.user_sessions for insert with check (auth.uid() = user_id);

-- 4) screenshot_flags
create table if not exists public.screenshot_flags (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_screenshot_flags_match_id on public.screenshot_flags(match_id);

alter table public.screenshot_flags enable row level security;

create policy "Admins can view screenshot_flags"
  on public.screenshot_flags for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Service can insert screenshot_flags"
  on public.screenshot_flags for insert with check (true);

-- 5) auto_resolved в match status
alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check
  check (status in (
    'scheduled', 'live', 'awaiting_result',
    'completed', 'cancelled', 'postponed', 'disputed', 'auto_resolved'
  ));

-- 6) trust_score_history для отслеживания серии честных матчей
create table if not exists public.trust_score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null,
  match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_trust_score_history_user_id on public.trust_score_history(user_id);

alter table public.trust_score_history enable row level security;

create policy "Users can view own trust_score_history"
  on public.trust_score_history for select
  using (auth.uid() = user_id);

create policy "Service can insert trust_score_history"
  on public.trust_score_history for insert with check (true);

