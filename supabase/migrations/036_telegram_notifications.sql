-- Telegram notifications: profiles.telegram_*, notification_queue, helpers & triggers

-- 1) Telegram fields in profiles
alter table public.profiles
  add column if not exists telegram_id bigint,
  add column if not exists telegram_username text,
  add column if not exists telegram_connected_at timestamptz;

-- 2) notification_queue table
create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_notification_queue_status_created_at
  on public.notification_queue(status, created_at);

alter table public.notification_queue enable row level security;

-- RLS: only service (backend) can manage notification_queue
create policy "Service can manage notification_queue"
  on public.notification_queue
  using (true)
  with check (true);

-- 3) Helper function to enqueue notifications from SQL
create or replace function public.enqueue_notification(
  p_user_id uuid,
  p_type text,
  p_payload jsonb
) returns void
language plpgsql
security definer
as $$
begin
  insert into public.notification_queue(user_id, type, payload, status)
  values (p_user_id, p_type, coalesce(p_payload, '{}'::jsonb), 'pending');
end;
$$;

-- 4) Trigger: trust_score changed → enqueue notification
create or replace function public.on_profile_trust_score_changed()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'UPDATE') and (new.trust_score is distinct from old.trust_score) then
    perform public.enqueue_notification(
      new.id,
      'trust_score_changed',
      jsonb_build_object(
        'old_trust_score', old.trust_score,
        'new_trust_score', new.trust_score
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_trust_score_changed on public.profiles;
create trigger on_profile_trust_score_changed
  after update of trust_score on public.profiles
  for each row
  execute procedure public.on_profile_trust_score_changed();

-- 5) Trigger: smurf_flag created → enqueue notification for player
create or replace function public.on_smurf_flag_created()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.enqueue_notification(
    new.user_id,
    'smurf_flag_created',
    jsonb_build_object(
      'smurf_flag_id', new.id,
      'reason', new.reason,
      'confidence_score', new.confidence_score
    )
  );
  return new;
end;
$$;

drop trigger if exists on_smurf_flag_created on public.smurf_flags;
create trigger on_smurf_flag_created
  after insert on public.smurf_flags
  for each row
  execute procedure public.on_smurf_flag_created();


