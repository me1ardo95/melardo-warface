-- Создание первого сезона миссий (60 дней), если нет активного
insert into public.seasons (name, start_date, end_date, is_active)
select
  'Сезон 1',
  date_trunc('day', now() at time zone 'UTC')::timestamptz,
  date_trunc('day', now() at time zone 'UTC')::timestamptz + interval '60 days',
  true
where not exists (select 1 from public.seasons where is_active = true);

-- Уровни Season Pass (XP для каждого уровня)
-- Формула: уровень N требует 100*N XP (нарастающий итог)
do $$
declare
  s_id uuid;
  xp int := 0;
  lvl int;
begin
  select id into s_id from public.seasons where is_active = true limit 1;
  if s_id is null then return; end if;

  for lvl in 1..50 loop
    xp := xp + (100 * lvl);
    insert into public.season_levels (season_id, level, xp_required, reward)
    values (s_id, lvl, xp, jsonb_build_object('description', 'Уровень ' || lvl))
    on conflict (season_id, level) do nothing;
  end loop;
end $$;

