-- Реферальная система

create table if not exists public.referrals (
  id uuid primary key default extensions.uuid_generate_v4(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  admin_notes text
);

alter table public.referrals enable row level security;

create policy "Admins can manage referrals"
  on public.referrals for all
  using (auth.role() = 'authenticated');

create index if not exists idx_referrals_referrer
  on public.referrals(referrer_user_id);

create index if not exists idx_referrals_referred
  on public.referrals(referred_user_id);



