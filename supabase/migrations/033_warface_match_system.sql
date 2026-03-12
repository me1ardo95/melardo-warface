-- Warface Match System: lobby codes, secret phrases, maps, cooldowns, rank, penalty

-- 1) profiles.rank (Warface in-game rank 1-100)
alter table public.profiles
  add column if not exists rank int default 1 check (rank >= 1 and rank <= 100);

-- 2) public_challenges: Warface fields (map, team_size, format, rounds)
-- Expand mode to allow all team sizes
alter table public.public_challenges drop constraint if exists public_challenges_mode_check;
alter table public.public_challenges add constraint public_challenges_mode_check
  check (mode in ('3x3', '4x4', '5x5', '6x6', '7x7', '8x8'));

alter table public.public_challenges
  add column if not exists map text,
  add column if not exists format text default 'BO1',
  add column if not exists rounds text default '6 раундов, овертайм включен';

-- Ensure mode supports all Warface team sizes (run only if constraint exists from 012)

-- 3) matches: Warface fields
alter table public.matches
  add column if not exists match_id_numeric int unique,
  add column if not exists lobby_code text,
  add column if not exists secret_phrase text,
  add column if not exists map text,
  add column if not exists team_size text,
  add column if not exists format text,
  add column if not exists rounds text,
  add column if not exists creator_team_id uuid references public.teams(id) on delete set null;

-- 4) Sequence and function for match_id_numeric
create sequence if not exists public.match_id_numeric_seq start 10000;

create or replace function public.get_next_match_id_numeric()
returns int language sql security definer as $$
  select nextval('public.match_id_numeric_seq')::int;
$$;

-- 5) match_confirmations: secret_phrase for validation
alter table public.match_confirmations
  add column if not exists secret_phrase text;

-- 6) Add awaiting_result to match status
alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check
  check (status in (
    'scheduled', 'live', 'awaiting_result',
    'completed', 'cancelled', 'postponed', 'disputed'
  ));

-- 7) match_penalties: admin-issued penalty (-50 rating)
create table if not exists public.match_penalties (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  reason text not null check (reason in (
    'false_result', 'missing_screenshot', 'cheating', 'other'
  )),
  points_delta int not null default -50,
  admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_match_penalties_match_id on public.match_penalties(match_id);
create index if not exists idx_match_penalties_team_id on public.match_penalties(team_id);

alter table public.match_penalties enable row level security;

create policy "Authenticated can view match_penalties"
  on public.match_penalties for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert match_penalties"
  on public.match_penalties for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
