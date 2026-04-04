alter table public.matches
  add column if not exists points_awarded boolean not null default false;

drop policy if exists "Captains can update team members profiles" on public.profiles;
create policy "Captains can update team members profiles"
  on public.profiles
  for update
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.team_members tm_captain
      join public.team_members tm_player
        on tm_captain.team_id = tm_player.team_id
      where tm_captain.user_id = auth.uid()
        and tm_captain.role = 'captain'
        and tm_player.user_id = profiles.id
    )
  );

drop policy if exists "Authenticated can insert profile points history" on public.profile_points_history;
create policy "Authenticated can insert profile points history"
  on public.profile_points_history
  for insert
  with check (auth.role() = 'authenticated');
