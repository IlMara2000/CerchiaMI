create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  username text not null default '',
  birth_date date,
  gender text not null default '',
  relationship_goal text not null default '',
  interests text[] not null default array[]::text[],
  display_name text not null,
  age integer not null check (age >= 18),
  city text not null,
  bio text not null default '',
  availability text not null default '',
  sections text[] not null default array['network']::text[],
  visibility text not null default 'circle' check (visibility in ('circle', 'matches')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists username text not null default '',
  add column if not exists birth_date date,
  add column if not exists gender text not null default '',
  add column if not exists relationship_goal text not null default '',
  add column if not exists interests text[] not null default array[]::text[];

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username <> '';

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  purpose text not null default 'Nuovo invito privato',
  created_by uuid references public.profiles(id) on delete set null,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  from_profile uuid not null references public.profiles(id) on delete cascade,
  to_profile uuid not null references public.profiles(id) on delete cascade,
  section text not null check (section in ('network', 'relationship', 'night')),
  created_at timestamptz not null default now(),
  unique (from_profile, to_profile, section),
  check (from_profile <> to_profile)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  profile_a uuid not null references public.profiles(id) on delete cascade,
  profile_b uuid not null references public.profiles(id) on delete cascade,
  section text not null check (section in ('network', 'relationship', 'night')),
  created_at timestamptz not null default now(),
  unique (profile_a, profile_b, section),
  check (profile_a <> profile_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_version text not null,
  accepted_context text not null default 'auth',
  user_agent text,
  accepted_at timestamptz not null default now(),
  unique (user_id, document_version, accepted_context)
);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_profile uuid not null references public.profiles(id) on delete cascade,
  blocked_profile uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (blocker_profile, blocked_profile),
  check (blocker_profile <> blocked_profile)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile uuid references public.profiles(id) on delete set null,
  reported_profile uuid references public.profiles(id) on delete set null,
  category text not null default 'altro'
    check (category in ('molestia', 'esplicito', 'fake', 'sicurezza', 'altro')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  reason text not null default 'self_service',
  status text not null default 'open'
    check (status in ('open', 'processing', 'completed', 'rejected')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.marketplace_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check (char_length(product_id) between 1 and 120),
  category text not null
    check (category in ('manga', 'cosplay', 'gaming', 'tattoo')),
  placement text not null check (char_length(placement) between 1 and 80),
  is_affiliate boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_clicks_created_at_idx
  on public.marketplace_clicks (created_at desc);

create index if not exists marketplace_clicks_product_idx
  on public.marketplace_clicks (product_id, created_at desc);

insert into public.invites (code, purpose)
values
  ('CERCHIAMI-2026', 'Codice iniziale CerchiaMi'),
  ('PRIVATO-18', 'Accesso privato 18+'),
  ('AMICI-001', 'Cerchia iniziale amici')
on conflict (code) do nothing;

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.marketplace_clicks enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.invites to authenticated;
grant select, insert, update, delete on public.likes to authenticated;
grant select, insert, update, delete on public.matches to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update on public.legal_acceptances to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert on public.user_reports to authenticated;
grant select, insert on public.account_deletion_requests to authenticated;
grant insert on public.marketplace_clicks to authenticated;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or not exists (
      select 1
      from public.user_blocks
      where (
        user_blocks.blocker_profile = auth.uid()
        and user_blocks.blocked_profile = profiles.id
      )
      or (
        user_blocks.blocker_profile = profiles.id
        and user_blocks.blocked_profile = auth.uid()
      )
    )
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());

drop policy if exists "invites_select_authenticated" on public.invites;
create policy "invites_select_authenticated"
  on public.invites for select
  to authenticated
  using (
    used_by is null
    or created_by = auth.uid()
    or used_by = auth.uid()
  );

drop policy if exists "invites_insert_authenticated" on public.invites;
create policy "invites_insert_authenticated"
  on public.invites for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "invites_claim_available" on public.invites;
create policy "invites_claim_available"
  on public.invites for update
  to authenticated
  using (
    used_by is null
    or created_by = auth.uid()
    or used_by = auth.uid()
  )
  with check (
    created_by = auth.uid()
    or used_by = auth.uid()
  );

drop policy if exists "invites_delete_own" on public.invites;
create policy "invites_delete_own"
  on public.invites for delete
  to authenticated
  using (created_by = auth.uid());

drop policy if exists "likes_select_involved" on public.likes;
create policy "likes_select_involved"
  on public.likes for select
  to authenticated
  using (from_profile = auth.uid() or to_profile = auth.uid());

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
  on public.likes for insert
  to authenticated
  with check (from_profile = auth.uid());

drop policy if exists "matches_select_involved" on public.matches;
create policy "matches_select_involved"
  on public.matches for select
  to authenticated
  using (profile_a = auth.uid() or profile_b = auth.uid());

drop policy if exists "matches_insert_involved" on public.matches;
create policy "matches_insert_involved"
  on public.matches for insert
  to authenticated
  with check (profile_a = auth.uid() or profile_b = auth.uid());

drop policy if exists "messages_select_match_members" on public.messages;
create policy "messages_select_match_members"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.matches
      where matches.id = messages.match_id
        and (matches.profile_a = auth.uid() or matches.profile_b = auth.uid())
    )
  );

drop policy if exists "messages_insert_match_members" on public.messages;
create policy "messages_insert_match_members"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.matches
      where matches.id = messages.match_id
        and (matches.profile_a = auth.uid() or matches.profile_b = auth.uid())
    )
  );

drop policy if exists "legal_acceptances_select_own" on public.legal_acceptances;
create policy "legal_acceptances_select_own"
  on public.legal_acceptances for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "legal_acceptances_insert_own" on public.legal_acceptances;
create policy "legal_acceptances_insert_own"
  on public.legal_acceptances for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "legal_acceptances_update_own" on public.legal_acceptances;
create policy "legal_acceptances_update_own"
  on public.legal_acceptances for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
  on public.user_blocks for select
  to authenticated
  using (blocker_profile = auth.uid());

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  to authenticated
  with check (blocker_profile = auth.uid());

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  to authenticated
  using (blocker_profile = auth.uid());

drop policy if exists "user_reports_select_own" on public.user_reports;
create policy "user_reports_select_own"
  on public.user_reports for select
  to authenticated
  using (reporter_profile = auth.uid());

drop policy if exists "user_reports_insert_own" on public.user_reports;
create policy "user_reports_insert_own"
  on public.user_reports for insert
  to authenticated
  with check (reporter_profile = auth.uid());

drop policy if exists "account_deletion_requests_select_own" on public.account_deletion_requests;
create policy "account_deletion_requests_select_own"
  on public.account_deletion_requests for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "account_deletion_requests_insert_own" on public.account_deletion_requests;
create policy "account_deletion_requests_insert_own"
  on public.account_deletion_requests for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "marketplace_clicks_insert_own" on public.marketplace_clicks;
create policy "marketplace_clicks_insert_own"
  on public.marketplace_clicks for insert
  to authenticated
  with check (user_id = auth.uid());

create or replace function public.like_profile(
  target_profile uuid,
  target_section text
)
returns table(match_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile uuid := auth.uid();
  left_profile uuid;
  right_profile uuid;
  created_match uuid;
begin
  if current_profile is null then
    raise exception 'Authentication required';
  end if;

  if target_profile = current_profile then
    raise exception 'Cannot like yourself';
  end if;

  if target_section not in ('network', 'relationship', 'night') then
    raise exception 'Invalid section';
  end if;

  if exists (
    select 1
    from public.user_blocks
    where (
      blocker_profile = current_profile
      and blocked_profile = target_profile
    )
    or (
      blocker_profile = target_profile
      and blocked_profile = current_profile
    )
  ) then
    raise exception 'Profile unavailable';
  end if;

  insert into public.likes (from_profile, to_profile, section)
  values (current_profile, target_profile, target_section)
  on conflict (from_profile, to_profile, section) do nothing;

  if exists (
    select 1
    from public.likes
    where from_profile = target_profile
      and to_profile = current_profile
      and section = target_section
  ) then
    if current_profile::text < target_profile::text then
      left_profile := current_profile;
      right_profile := target_profile;
    else
      left_profile := target_profile;
      right_profile := current_profile;
    end if;

    insert into public.matches (profile_a, profile_b, section)
    values (left_profile, right_profile, target_section)
    on conflict (profile_a, profile_b, section)
    do update set section = excluded.section
    returning id into created_match;
  end if;

  return query select created_match;
end;
$$;

grant execute on function public.like_profile(uuid, text) to authenticated;
