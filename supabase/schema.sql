create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

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

drop policy if exists "invites_select_authenticated" on public.invites;
create policy "invites_select_authenticated"
  on public.invites for select
  to authenticated
  using (true);

drop policy if exists "invites_insert_authenticated" on public.invites;
create policy "invites_insert_authenticated"
  on public.invites for insert
  to authenticated
  with check (created_by = auth.uid());

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
