-- Public challenges: open calls where a team looks for an opponent

create table public.public_challenges (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  mode text not null check (mode in ('5x5', '8x8')),
  scheduled_at timestamptz,
  comment text,
  status text not null default 'active' check (status in ('active', 'accepted', 'cancelled')),
  match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.public_challenges enable row level security;

create policy "Anyone can view public challenges"
  on public.public_challenges for select
  using (true);

create policy "Team members can create public challenges"
  on public.public_challenges for insert
  with check (exists (
    select 1
    from public.team_members tm
    where tm.team_id = public_challenges.team_id
      and tm.user_id = auth.uid()
  ));

create policy "Team members can update own challenges"
  on public.public_challenges for update
  using (exists (
    select 1
    from public.team_members tm
    where tm.team_id = public_challenges.team_id
      and tm.user_id = auth.uid()
  ));

create index idx_public_challenges_status
  on public.public_challenges(status);

create index idx_public_challenges_team
  on public.public_challenges(team_id);

