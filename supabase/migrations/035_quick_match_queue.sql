-- Quick Match queue

create table if not exists public.quick_match_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  mode text not null check (mode in ('3x3', '4x4', '5x5', '6x6', '7x7', '8x8')),
  map text,
  status text not null default 'searching' check (status in ('searching', 'matched', 'cancelled')),
  match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_quick_match_queue_status_mode on public.quick_match_queue(status, mode);
create index if not exists idx_quick_match_queue_created_at on public.quick_match_queue(created_at);

alter table public.quick_match_queue enable row level security;

create policy "Users can view own queue entries"
  on public.quick_match_queue for select
  using (auth.uid() = user_id);

create policy "Users can insert queue entries"
  on public.quick_match_queue for insert
  with check (auth.uid() = user_id);

create policy "Users can update own queue entries"
  on public.quick_match_queue for update
  using (auth.uid() = user_id);

