drop policy if exists "account_sync_state_select_own"
  on public.account_sync_state;
create policy "account_sync_state_select_own"
  on public.account_sync_state for select
  to authenticated
  using (user_id = (select auth.uid()));
