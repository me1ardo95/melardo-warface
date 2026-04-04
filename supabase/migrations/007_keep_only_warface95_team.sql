-- Оставить только одну команду «Warface-95», остальные удалить.
-- Запускать после того, как в базе есть команда с названием Warface-95.
-- У зависимых записей: team_members — cascade, в matches — set null.

delete from public.teams
where id not in (
  select id from public.teams where name = 'Warface-95' limit 1
);

