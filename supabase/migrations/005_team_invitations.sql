-- Team invitations (captain invites by player nick; user accepts/declines on profile)
-- Run in Supabase SQL Editor after 004_teams_description.sql

create table public.team_invitations (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now() not null,
  unique(team_id, user_id)
);

alter table public.team_invitations enable row level security;

-- Anyone authenticated can view invitations (for "my invitations" and captain's list)
create policy "Users can view own invitations"
  on public.team_invitations for select
  using (auth.uid() = user_id);

create policy "Captains can view invitations for their team"
  on public.team_invitations for select
  using (exists (
    select 1 from public.team_members tm
    where tm.team_id = team_invitations.team_id and tm.user_id = auth.uid() and tm.role = 'captain'
  ));

-- Only captains can create invitations
create policy "Captains can create invitations"
  on public.team_invitations for insert
  with check (exists (
    select 1 from public.team_members tm
    where tm.team_id = team_invitations.team_id and tm.user_id = auth.uid() and tm.role = 'captain'
  ));

-- Invited user can update (respond accept/decline)
create policy "Invited user can update invitation"
  on public.team_invitations for update
  using (auth.uid() = user_id);
