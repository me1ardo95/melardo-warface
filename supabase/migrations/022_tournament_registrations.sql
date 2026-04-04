-- Турнирные регистрации: команда может зарегистрироваться в турнир только один раз

create table if not exists public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamp with time zone default now() not null,
  unique (tournament_id, team_id)
);


