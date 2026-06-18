create table if not exists public.account_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  data_version integer not null default 1 check (data_version > 0),
  client_updated_at timestamptz,
  server_updated_at timestamptz not null default now(),
  migrated_at timestamptz not null default now(),
  check (jsonb_typeof(state) = 'object')
);

alter table public.account_sync_state
  add column if not exists data_version integer not null default 1
    check (data_version > 0),
  add column if not exists migrated_at timestamptz not null default now();

create table if not exists public.device_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id_hash text not null check (char_length(device_id_hash) = 64),
  ip_hash text not null check (char_length(ip_hash) = 64),
  user_agent_hash text not null check (char_length(user_agent_hash) = 64),
  app_version text not null default '',
  data_version integer not null default 1 check (data_version > 0),
  migration_status text not null default 'complete'
    check (migration_status in ('pending', 'complete', 'failed')),
  first_seen_at timestamptz not null default now(),
  last_migrated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id_hash)
);

alter table public.device_connections
  add column if not exists data_version integer not null default 1
    check (data_version > 0),
  add column if not exists migration_status text not null default 'complete'
    check (migration_status in ('pending', 'complete', 'failed')),
  add column if not exists last_migrated_at timestamptz not null default now();

create table if not exists public.account_device_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id_hash text not null check (char_length(device_id_hash) = 64),
  ip_hash text not null check (char_length(ip_hash) = 64),
  observed_on date not null default current_date,
  app_version text not null default '',
  data_version integer not null default 1 check (data_version > 0),
  migration_applied boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id_hash, ip_hash, observed_on)
);

create index if not exists device_connections_user_last_seen_idx
  on public.device_connections (user_id, last_seen_at desc);

create index if not exists account_device_events_user_last_seen_idx
  on public.account_device_events (user_id, last_seen_at desc);

alter table public.account_sync_state enable row level security;
alter table public.device_connections enable row level security;
alter table public.account_device_events enable row level security;

revoke all on public.account_sync_state from anon, authenticated;
grant select on public.account_sync_state to authenticated;
grant select, insert, update, delete on public.account_sync_state to service_role;
grant select, insert, update, delete on public.device_connections to service_role;
grant select, insert, update, delete on public.account_device_events to service_role;
revoke all on public.device_connections from anon, authenticated;
revoke all on public.account_device_events from anon, authenticated;

drop policy if exists "account_sync_state_select_own"
  on public.account_sync_state;
create policy "account_sync_state_select_own"
  on public.account_sync_state for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "device_connections_select_own"
  on public.device_connections;
