revoke all on function public.like_profile(uuid, text) from public, anon;
grant execute on function public.like_profile(uuid, text) to authenticated;
