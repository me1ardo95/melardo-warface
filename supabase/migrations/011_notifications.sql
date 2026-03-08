-- Notifications for players and teams
-- Run after previous migrations in the Supabase SQL Editor

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text not null,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.notifications enable row level security;

create policy "Users see own notifications"
  on public.notifications for select
  using (user_id is not null and user_id = auth.uid());

create policy "Captains see team notifications"
  on public.notifications for select
  using (
    team_id is not null
    and exists (
      select 1
      from public.team_members tm
      where tm.team_id = notifications.team_id
        and tm.user_id = auth.uid()
        and tm.role = 'captain'
    )
  );

create index idx_notifications_user
  on public.notifications(user_id)
  where user_id is not null;

create index idx_notifications_team
  on public.notifications(team_id)
  where team_id is not null;

create index idx_notifications_read
  on public.notifications(is_read);

