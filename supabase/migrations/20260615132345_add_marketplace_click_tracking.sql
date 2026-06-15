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

alter table public.marketplace_clicks enable row level security;

grant insert on public.marketplace_clicks to authenticated;

drop policy if exists "marketplace_clicks_insert_own" on public.marketplace_clicks;
create policy "marketplace_clicks_insert_own"
  on public.marketplace_clicks for insert
  to authenticated
  with check (user_id = auth.uid());
