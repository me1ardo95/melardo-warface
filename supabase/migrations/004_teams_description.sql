-- Add description to teams (optional, for create form)
-- Run in Supabase SQL Editor after 003_teams_city_mode.sql

alter table public.teams
  add column if not exists description text;
