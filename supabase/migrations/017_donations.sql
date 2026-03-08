-- Донаты и поддержка проекта

create table if not exists public.donations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  amount int not null check (amount >= 0),
  points_awarded int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  proof_url text,
  admin_notes text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.donations enable row level security;

create policy "Users can view own donations"
  on public.donations for select
  using (user_id = auth.uid());

create policy "Admins can manage donations"
  on public.donations for all
  using (auth.role() = 'authenticated');

create index if not exists idx_donations_user
  on public.donations(user_id)
  where user_id is not null;

create index if not exists idx_donations_team
  on public.donations(team_id)
  where team_id is not null;

