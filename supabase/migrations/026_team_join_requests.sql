-- Заявки на вступление в команду
-- Используется в /api/team/join-request и /api/team/handle-request
-- Создаёт таблицу team_join_requests и политики RLS для игроков и капитанов.

create table if not exists public.team_join_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_join_requests enable row level security;

-- Игрок видит только свои заявки
create policy if not exists "Users can view own join requests"
  on public.team_join_requests
  for select
  using (auth.uid() = user_id);

-- Капитаны видят заявки в свою команду (в том числе без выбранной команды)
create policy if not exists "Captains can view join requests for their team"
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

-- Игрок может создавать заявку только от своего имени
create policy if not exists "Users can create own join requests"
  on public.team_join_requests
  for insert
  with check (auth.uid() = user_id);

-- Игрок может обновлять только свои заявки (например, отменить)
create policy if not exists "Users can update own join requests"
  on public.team_join_requests
  for update
  using (auth.uid() = user_id);

-- Капитаны могут менять статус заявок в свою команду (approve/reject)
create policy if not exists "Captains can update join requests for their team"
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

-- Триггер для updated_at
create trigger if not exists set_team_join_requests_updated_at
  before update on public.team_join_requests
  for each row
  execute function public.set_updated_at();

