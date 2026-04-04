-- Связи матчей между раундами и дополнительные ограничения целостности.

-- 1) next_match_id: ссылка на матч следующего раунда
alter table public.matches
  add column if not exists next_match_id uuid references public.matches(id) on delete set null;

create index if not exists idx_matches_next_match_id
  on public.matches(next_match_id);

-- 2) Уникальность регистрации команды в турнире
create unique index if not exists idx_tournament_registrations_unique
  on public.tournament_registrations(tournament_id, team_id);

-- 3) Ограничение: один пользователь — одна команда
create unique index if not exists idx_team_members_unique_user
  on public.team_members(user_id);

-- 4) Ограничение на разумный диапазон счёта
alter table public.matches
  add constraint matches_score_range
  check (
    score_team1 between 0 and 1000
    and score_team2 between 0 and 1000
  );


