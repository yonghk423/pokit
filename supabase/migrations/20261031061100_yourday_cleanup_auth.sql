begin;
-- Reuse the existing Vault value; no credential rotation or value export.
create or replace function public.yourday_ai_authorize_cleanup(p_token text) returns boolean
language sql security definer set search_path = '' as $$
 select p_token is not null and exists(
  select 1 from vault.decrypted_secrets
  where name='yourday_ai_cleanup_token' and decrypted_secret=p_token
 );
$$;
revoke all on function public.yourday_ai_authorize_cleanup(text) from public,anon,authenticated;
grant execute on function public.yourday_ai_authorize_cleanup(text) to service_role;
notify pgrst,'reload schema';
commit;
