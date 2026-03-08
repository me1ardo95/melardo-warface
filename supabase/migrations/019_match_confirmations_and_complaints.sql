-- Match confirmations, disputed status, complaints updates, profiles.role
-- Storage bucket "complaints" should be created in Supabase Dashboard (Storage) for proof uploads.

-- Add 'disputed' to matches status
alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check
  check (status in ('scheduled', 'live', 'completed', 'cancelled', 'postponed', 'disputed'));

-- Match confirmations (captain submits score + screenshot)
create table if not exists public.match_confirmations (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  captain_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  score_team1 int not null,
  score_team2 int not null,
  screenshot_url text not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'disputed')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(match_id, captain_id)
);

alter table public.match_confirmations enable row level security;

create policy "Authenticated can view match_confirmations"
  on public.match_confirmations for select
  using (auth.role() = 'authenticated');

create policy "Captains can insert match_confirmations"
  on public.match_confirmations for insert
  with check (auth.uid() = captain_id);

create policy "Service can update match_confirmations"
  on public.match_confirmations for update
  using (auth.role() = 'authenticated');

create trigger set_match_confirmations_updated_at before update on public.match_confirmations
  for each row execute function public.set_updated_at();

-- Add role to profiles (admin/user)
alter table public.profiles add column if not exists role text default 'user' check (role in ('admin', 'user'));

-- Add proof_url, reason, player_id, team_id to complaints
alter table public.complaints add column if not exists proof_url text;
alter table public.complaints add column if not exists reason text;
alter table public.complaints add column if not exists player_id uuid references public.profiles(id) on delete set null;
alter table public.complaints add column if not exists team_id uuid references public.teams(id) on delete set null;

-- Add policy for admins to view all complaints
create policy "Admins can view all complaints"
  on public.complaints for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update complaints"
  on public.complaints for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
