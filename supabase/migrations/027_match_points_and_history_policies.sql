-- Безопасное начисление очков за матчи и история изменений
-- 1) Добавляет флаг points_awarded в matches, чтобы не начислять очки дважды.
-- 2) Разрешает капитанам обновлять профили своих тиммейтов (для очков).
-- 3) Разрешает аутентифицированным пользователям писать в history-таблицы.

-- Флаг, чтобы один и тот же матч не начислял очки повторно
alter table public.matches
  add column if not exists points_awarded boolean not null default false;

-- Капитаны могут обновлять профили игроков своей команды (для начисления очков)
create policy if not exists "Captains can update team members profiles"
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

-- Разрешаем аутентифицированным пользователям писать историю очков.
-- (Начисление очков происходит из API /api/match/confirm от имени капитанов.)
create policy if not exists "Authenticated can insert profile points history"
  on public.profile_points_history
  for insert
  with check (auth.role() = 'authenticated');

create policy if not exists "Authenticated can insert team points history"
  on public.team_points_history
  for insert
  with check (auth.role() = 'authenticated');

