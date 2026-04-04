-- Esports platform: initial schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users; "users" in your app)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS: profiles
alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Teams
create table public.teams (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  logo_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.teams enable row level security;

create policy "Anyone can view teams"
  on public.teams for select
  using (true);

create policy "Authenticated users can insert teams"
  on public.teams for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update teams"
  on public.teams for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete teams"
  on public.teams for delete
  using (auth.role() = 'authenticated');

-- Tournaments
create table public.tournaments (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  game text,
  start_date timestamptz,
  end_date timestamptz,
  status text default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.tournaments enable row level security;

create policy "Anyone can view tournaments"
  on public.tournaments for select
  using (true);

create policy "Authenticated users can manage tournaments"
  on public.tournaments for all
  using (auth.role() = 'authenticated');

-- Matches (references teams and tournaments)
create table public.matches (
  id uuid primary key default extensions.uuid_generate_v4(),
  tournament_id uuid references public.tournaments(id) on delete set null,
  team1_id uuid references public.teams(id) on delete set null,
  team2_id uuid references public.teams(id) on delete set null,
  status text default 'scheduled' check (status in ('scheduled', 'live', 'completed', 'cancelled', 'postponed')),
  score_team1 int default 0,
  score_team2 int default 0,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.matches enable row level security;

create policy "Anyone can view matches"
  on public.matches for select
  using (true);

create policy "Authenticated users can manage matches"
  on public.matches for all
  using (auth.role() = 'authenticated');

-- Rankings (per tournament)
create table public.rankings (
  id uuid primary key default extensions.uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  rank int not null,
  points int default 0,
  wins int default 0,
  losses int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(tournament_id, team_id)
);

alter table public.rankings enable row level security;

create policy "Anyone can view rankings"
  on public.rankings for select
  using (true);

create policy "Authenticated users can manage rankings"
  on public.rankings for all
  using (auth.role() = 'authenticated');

-- Optional: updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_teams_updated_at before update on public.teams
  for each row execute function public.set_updated_at();
create trigger set_tournaments_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();
create trigger set_matches_updated_at before update on public.matches
  for each row execute function public.set_updated_at();
create trigger set_rankings_updated_at before update on public.rankings
  for each row execute function public.set_updated_at();


