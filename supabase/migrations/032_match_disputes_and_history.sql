-- match_disputes, match_history, matches.screenshot_url

-- 1) match_disputes
create table if not exists public.match_disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  reported_by_team_id uuid references public.teams(id) on delete set null,
  reason text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved')),
  admin_comment text,
  created_at timestamptz default now() not null
);

create index if not exists idx_match_disputes_match_id on public.match_disputes(match_id);
create index if not exists idx_match_disputes_status on public.match_disputes(status);

alter table public.match_disputes enable row level security;

create policy "Anyone can view match_disputes"
  on public.match_disputes for select
  using (true);

create policy "Authenticated can insert match_disputes"
  on public.match_disputes for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update match_disputes"
  on public.match_disputes for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 2) match_history
create table if not exists public.match_history (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  old_score_team1 int,
  old_score_team2 int,
  new_score_team1 int,
  new_score_team2 int,
  changed_by uuid references auth.users(id) on delete set null,
  action text,
  created_at timestamptz default now() not null
);

create index if not exists idx_match_history_match_id on public.match_history(match_id);

alter table public.match_history enable row level security;

create policy "Authenticated can view match_history"
  on public.match_history for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert match_history"
  on public.match_history for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3) matches.screenshot_url (основной скриншот при завершении)
alter table public.matches
  add column if not exists screenshot_url text;
