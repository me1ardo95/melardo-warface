-- Esports platform: tables for API routes (team join, challenges, complaints, tournament registration)
-- Run after 001_initial_schema.sql in the Supabase SQL Editor

-- Team members (users belonging to a team)
create table public.team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member' check (role in ('captain', 'member')),
  created_at timestamptz default now() not null,
  unique(team_id, user_id)
);

alter table public.team_members enable row level security;

create policy "Anyone can view team members"
  on public.team_members for select
  using (true);

create policy "Authenticated users can join teams"
  on public.team_members for insert
  with check (auth.uid() = user_id);

create policy "Members can leave or captains can remove"
  on public.team_members for delete
  using (auth.uid() = user_id or exists (
    select 1 from public.team_members tm
    where tm.team_id = team_members.team_id and tm.user_id = auth.uid() and tm.role = 'captain'
  ));

create policy "Captains can update role"
  on public.team_members for update
  using (exists (
    select 1 from public.team_members tm
    where tm.team_id = team_members.team_id and tm.user_id = auth.uid() and tm.role = 'captain'
  ));

-- Challenges (one team challenging another, e.g. for a match)
create table public.challenges (
  id uuid primary key default uuid_generate_v4(),
  challenger_team_id uuid not null references public.teams(id) on delete cascade,
  challenged_team_id uuid not null references public.teams(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  message text,
  responded_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint different_teams check (challenger_team_id != challenged_team_id)
);

alter table public.challenges enable row level security;

create policy "Anyone can view challenges"
  on public.challenges for select
  using (true);

create policy "Authenticated users can create challenges"
  on public.challenges for insert
  with check (auth.role() = 'authenticated');

create policy "Challenged team or challenger can update (respond)"
  on public.challenges for update
  using (auth.role() = 'authenticated');

create trigger set_challenges_updated_at before update on public.challenges
  for each row execute function public.set_updated_at();

-- Complaints (e.g. about a match or conduct)
create table public.complaints (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  tournament_id uuid references public.tournaments(id) on delete set null,
  subject text not null,
  description text,
  status text default 'open' check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.complaints enable row level security;

create policy "Users can view own complaints"
  on public.complaints for select
  using (auth.uid() = user_id);

create policy "Authenticated users can create complaints"
  on public.complaints for insert
  with check (auth.uid() = user_id);

create policy "Users can update own complaints (e.g. add info)"
  on public.complaints for update
  using (auth.uid() = user_id);

create trigger set_complaints_updated_at before update on public.complaints
  for each row execute function public.set_updated_at();

-- Tournament registrations (teams registering for a tournament)
create table public.tournament_registrations (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(tournament_id, team_id)
);

alter table public.tournament_registrations enable row level security;

create policy "Anyone can view tournament registrations"
  on public.tournament_registrations for select
  using (true);

create policy "Authenticated users can register teams"
  on public.tournament_registrations for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can unregister"
  on public.tournament_registrations for delete
  using (auth.role() = 'authenticated');
