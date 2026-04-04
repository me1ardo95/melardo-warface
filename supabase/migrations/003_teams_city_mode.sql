-- Add city and mode columns to teams (optional fields for create form)
-- Run in Supabase SQL Editor after 001_initial_schema.sql

alter table public.teams
  add column if not exists city text,
  add column if not exists mode text;

