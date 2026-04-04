-- system_logs, indexes, match-screenshots bucket, score constraint

-- 1) Таблица system_logs для критических ошибок
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  data jsonb default '{}',
  created_at timestamptz default now() not null
);

create index if not exists idx_system_logs_created_at on public.system_logs(created_at);
create index if not exists idx_system_logs_type on public.system_logs(type);

alter table public.system_logs enable row level security;

-- Только сервис/админы (через service role) пишут логи
create policy "Service can insert system_logs"
  on public.system_logs for insert
  with check (true);

create policy "Admins can view system_logs"
  on public.system_logs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 2) Индексы для 100+ игроков
create index if not exists idx_matches_tournament_id on public.matches(tournament_id);
-- idx_matches_next_match_id уже есть в 029
create index if not exists idx_tournament_registrations_tournament_id on public.tournament_registrations(tournament_id);
create index if not exists idx_team_members_team_id on public.team_members(team_id);

-- 3) Ограничение счёта 0-100 (обновляем с 029)
alter table public.matches drop constraint if exists matches_score_range;
alter table public.matches add constraint matches_score_range
  check (score_team1 between 0 and 100 and score_team2 between 0 and 100);

-- 4) Bucket match-screenshots (5MB limit; MIME проверка в API)
insert into storage.buckets (id, name, public, file_size_limit)
values ('match-screenshots', 'match-screenshots', true, 5242880)
on conflict (id) do update set file_size_limit = 5242880;

-- Политика загрузки для аутентифицированных
drop policy if exists "Authenticated can upload match screenshots" on storage.objects;

create policy "Authenticated can upload match screenshots"
  on storage.objects for insert
  with check (
    bucket_id = 'match-screenshots' and auth.role() = 'authenticated'
  );

drop policy if exists "Anyone can view match screenshots" on storage.objects;

create policy "Anyone can view match screenshots"
  on storage.objects for select
  using (bucket_id = 'match-screenshots');


