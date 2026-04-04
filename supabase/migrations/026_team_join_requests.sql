create table if not exists public.team_join_requests (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_join_requests enable row level security;

drop policy if exists "Users can view own join requests" on public.team_join_requests;
create policy "Users can view own join requests"
  on public.team_join_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "Captains can view join requests for their team" on public.team_join_requests;
create policy "Captains can view join requests for their team"
  on public.team_join_requests
  for select
  using (
    team_id is null
    or exists (
      select 1
      from public.team_members tm
      where tm.team_id = team_join_requests.team_id
        and tm.user_id = auth.uid()
        and tm.role = 'captain'
    )
  );

drop policy if exists "Users can create own join requests" on public.team_join_requests;
create policy "Users can create own join requests"
  on public.team_join_requests
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own join requests" on public.team_join_requests;
create policy "Users can update own join requests"
  on public.team_join_requests
  for update
  using (auth.uid() = user_id);

drop policy if exists "Captains can update join requests for their team" on public.team_join_requests;
create policy "Captains can update join requests for their team"
  on public.team_join_requests
  for update
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.team_id = team_join_requests.team_id
        and tm.user_id = auth.uid()
        and tm.role = 'captain'
    )
  );

drop trigger if exists set_team_join_requests_updated_at on public.team_join_requests;
create trigger set_team_join_requests_updated_at
  before update on public.team_join_requests
  for each row
  execute function public.set_updated_at();
