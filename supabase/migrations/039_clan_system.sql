-- Clan System — полноценная клановая система уровня esports

-- 1) clans
create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  description text,
  logo_url text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null default 1000,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_clans_tag_lower on public.clans(lower(tag));
create index if not exists idx_clans_rating on public.clans(rating desc);
create index if not exists idx_clans_owner on public.clans(owner_id);

alter table public.clans enable row level security;

create policy "Anyone can view clans" on public.clans for select using (true);
create policy "Authenticated can create clans" on public.clans for insert
  with check (auth.uid() = owner_id);

create policy "Owner can delete clan" on public.clans for delete
  using (auth.uid() = owner_id);

-- 2) clan_members (один клан на игрока — проверка в приложении)
create table if not exists public.clan_members (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','captain','member')),
  joined_at timestamptz not null default now(),
  unique(clan_id, user_id),
  unique(user_id)
);

create index if not exists idx_clan_members_clan on public.clan_members(clan_id);
create index if not exists idx_clan_members_user on public.clan_members(user_id);

alter table public.clan_members enable row level security;

create policy "Anyone can view clan_members" on public.clan_members for select using (true);
create policy "Owner and captains can add members" on public.clan_members for insert
  with check (
    exists (select 1 from public.clan_members cm where cm.clan_id = clan_members.clan_id and cm.user_id = auth.uid() and cm.role in ('owner','captain'))
  );
create policy "Members can leave, owner/captain can remove" on public.clan_members for delete
  using (
    auth.uid() = user_id or
    exists (select 1 from public.clans c where c.id = clan_members.clan_id and c.owner_id = auth.uid()) or
    exists (
      select 1 from public.clan_members cm
      where cm.clan_id = clan_members.clan_id and cm.user_id = auth.uid() and cm.role in ('owner','captain')
    )
  );
create policy "Owner can update roles" on public.clan_members for update
  using (exists (select 1 from public.clans c where c.id = clan_members.clan_id and c.owner_id = auth.uid()));

-- 3) clan_invites
create table if not exists public.clan_invites (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(clan_id, user_id)
);

create index if not exists idx_clan_invites_clan on public.clan_invites(clan_id);
create index if not exists idx_clan_invites_user on public.clan_invites(user_id);

alter table public.clan_invites enable row level security;

create policy "Users see own or clan invites" on public.clan_invites for select
  using (auth.uid() = user_id or auth.uid() = invited_by or
    exists (select 1 from public.clan_members cm where cm.clan_id = clan_invites.clan_id and cm.user_id = auth.uid()));
create policy "Owner and captains can invite" on public.clan_invites for insert
  with check (
    auth.uid() = invited_by and
    (exists (select 1 from public.clans c where c.id = clan_invites.clan_id and c.owner_id = auth.uid()) or
     exists (select 1 from public.clan_members cm where cm.clan_id = clan_invites.clan_id and cm.user_id = auth.uid() and cm.role in ('owner','captain')))
  );
create policy "Invitee or inviter can update status" on public.clan_invites for update
  using (auth.uid() = user_id or auth.uid() = invited_by);

-- 4) teams.clan_id — привязка команды к клану для клановых матчей
alter table public.teams add column if not exists clan_id uuid references public.clans(id) on delete set null;
create index if not exists idx_teams_clan on public.teams(clan_id) where clan_id is not null;

-- 5) clan_rating_history
create table if not exists public.clan_rating_history (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  old_rating int not null,
  new_rating int not null,
  match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_clan_rating_history_clan on public.clan_rating_history(clan_id);

alter table public.clan_rating_history enable row level security;
create policy "Anyone can view clan_rating_history" on public.clan_rating_history for select using (true);

-- 7) clan_wars
create table if not exists public.clan_wars (
  id uuid primary key default gen_random_uuid(),
  clan1_id uuid not null references public.clans(id) on delete cascade,
  clan2_id uuid not null references public.clans(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','finished')),
  format text not null default 'BO1' check (format in ('BO1','BO3','BO5')),
  winner_clan_id uuid references public.clans(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint clan_war_different_clans check (clan1_id != clan2_id)
);

create index if not exists idx_clan_wars_clan1 on public.clan_wars(clan1_id);
create index if not exists idx_clan_wars_clan2 on public.clan_wars(clan2_id);

alter table public.clan_wars enable row level security;
create policy "Anyone can view clan_wars" on public.clan_wars for select using (true);
create policy "Owner and captains can create clan_wars" on public.clan_wars for insert
  with check (
    exists (select 1 from public.clan_members cm where cm.clan_id = clan_wars.clan1_id and cm.user_id = auth.uid() and cm.role in ('owner','captain'))
  );
create policy "Participants can update clan_wars" on public.clan_wars for update
  using (
    exists (select 1 from public.clan_members cm where cm.clan_id = clan_wars.clan1_id and cm.user_id = auth.uid()) or
    exists (select 1 from public.clan_members cm where cm.clan_id = clan_wars.clan2_id and cm.user_id = auth.uid())
  );

-- 6) clan_matches — связь матча с кланами
create table if not exists public.clan_matches (
  id uuid primary key default gen_random_uuid(),
  clan1_id uuid not null references public.clans(id) on delete cascade,
  clan2_id uuid not null references public.clans(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  clan_war_id uuid references public.clan_wars(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(match_id)
);

create index if not exists idx_clan_matches_clan1 on public.clan_matches(clan1_id);
create index if not exists idx_clan_matches_clan2 on public.clan_matches(clan2_id);

alter table public.clan_matches enable row level security;
create policy "Anyone can view clan_matches" on public.clan_matches for select using (true);

-- 7) clan_seasons
create table if not exists public.clan_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date timestamptz not null,
  end_date timestamptz not null
);

alter table public.clan_seasons enable row level security;
create policy "Anyone can view clan_seasons" on public.clan_seasons for select using (true);

-- 8) clan_season_stats
create table if not exists public.clan_season_stats (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  season_id uuid not null references public.clan_seasons(id) on delete cascade,
  wins int not null default 0,
  losses int not null default 0,
  rating int not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clan_id, season_id)
);

create index if not exists idx_clan_season_stats_clan on public.clan_season_stats(clan_id);
create index if not exists idx_clan_season_stats_season on public.clan_season_stats(season_id);

alter table public.clan_season_stats enable row level security;
create policy "Anyone can view clan_season_stats" on public.clan_season_stats for select using (true);

-- 9) clan_messages (чат клана)
create table if not exists public.clan_messages (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_clan_messages_clan on public.clan_messages(clan_id);

alter table public.clan_messages enable row level security;
create policy "Clan members can view clan_messages" on public.clan_messages for select
  using (exists (select 1 from public.clan_members cm where cm.clan_id = clan_messages.clan_id and cm.user_id = auth.uid()));
create policy "Clan members can insert clan_messages" on public.clan_messages for insert
  with check (auth.uid() = user_id and exists (select 1 from public.clan_members cm where cm.clan_id = clan_messages.clan_id and cm.user_id = auth.uid()));

-- Триггер: при создании клана добавляем владельца в clan_members
create or replace function public.on_clan_created_add_owner()
returns trigger language plpgsql security definer as $$
begin
  insert into public.clan_members (clan_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;
create trigger on_clan_created_add_owner
  after insert on public.clans
  for each row execute function public.on_clan_created_add_owner();




create policy "Owner and captains can update clan" on public.clans for update
  using (
    auth.uid() = owner_id or
    exists (
      select 1 from public.clan_members cm
      where cm.clan_id = clans.id and cm.user_id = auth.uid() and cm.role in ('owner','captain')
    )
  );
