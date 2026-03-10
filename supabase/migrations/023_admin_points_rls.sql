-- Allow admins to update any profile (for points adjustment from admin panel)
create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Allow admins to insert into profile_points_history
create policy "Admins can insert profile points history"
  on public.profile_points_history for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Allow admins to insert into team_points_history
create policy "Admins can insert team points history"
  on public.team_points_history for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
