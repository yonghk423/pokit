begin;
-- Retired Storage buckets were deleted through Storage API after explicit approval.
-- Keep accounting records but remove obsolete image pointers and cleanup credential.
update public.yourday_ai_outputs set object_path=null where object_path is not null;
delete from vault.secrets where name in ('hero_ai_cleanup_token','yourday_ai_cleanup_token');
commit;
