-- Add warface_nick to profiles (required for in-game invites)
-- Run in Supabase SQL Editor after 005_team_invitations.sql

alter table public.profiles
  add column if not exists warface_nick text;

