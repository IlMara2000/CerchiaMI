revoke all on public.account_sync_state from anon, authenticated;
grant select on public.account_sync_state to authenticated;
grant select, insert, update, delete
  on public.account_sync_state
  to service_role;
