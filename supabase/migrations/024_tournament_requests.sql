-- Tournament requests: user-submitted requests to create a tournament (admin approves/rejects)
create table if not exists public.tournament_requests (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  mode text not null check (mode in ('5x5', '8x8')),
  format text not null check (format in ('single_elimination', 'round_robin')),
  min_teams int,
  max_teams int,
  requested_date timestamptz,
  comment text,
  fair_play_agreed boolean default true,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.tournament_requests enable row level security;

-- Users can insert their own requests
create policy "Users can insert own tournament requests"
  on public.tournament_requests for insert
  with check (auth.uid() = user_id);

-- Users can view own requests
create policy "Users can view own tournament requests"
  on public.tournament_requests for select
  using (auth.uid() = user_id);

-- Admins can view and update all
create policy "Admins can view all tournament requests"
  on public.tournament_requests for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update tournament requests"
  on public.tournament_requests for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create trigger set_tournament_requests_updated_at
  before update on public.tournament_requests
  for each row execute function public.set_updated_at();

