begin;
-- Preserve rows, foreign keys, RLS and the active temporary quota window.
select pg_advisory_xact_lock(2801028);
do $rename$
declare item record; definition text;
begin
 if to_regclass('public.hero_ai_outputs') is not null then
  if exists(select 1 from public.hero_ai_outputs o join public.hero_ai_jobs j on j.id=o.job_id
    where (o.state='processing' and o.started_at>now()-interval '5 minutes')
    or (o.state='reserved' and j.created_at>now()-interval '20 minutes')) then
   raise exception 'An AI job is active; wait for completion before renaming';
  end if;
 end if;
 for item in select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname like 'hero\_%' escape '\' loop
  execute format('alter table public.%I rename to %I',item.relname,replace(item.relname,'hero_','yourday_'));
 end loop;
 for item in select oid,proname from pg_proc where pronamespace='public'::regnamespace and proname like 'hero\_%' escape '\' loop
  definition:=replace(pg_get_functiondef(item.oid),'hero_','yourday_');
  execute definition;
 end loop;
 -- New functions must have the same restricted service-role access as before.
 revoke all on function public.yourday_ai_remaining(uuid),public.yourday_ai_reserve(uuid,text,text,integer),public.yourday_ai_claim(uuid,text,integer) from public,anon,authenticated;
 grant execute on function public.yourday_ai_remaining(uuid),public.yourday_ai_reserve(uuid,text,text,integer),public.yourday_ai_claim(uuid,text,integer) to service_role;
 for item in select oid,proname,pg_get_function_identity_arguments(oid) as args from pg_proc where pronamespace='public'::regnamespace and proname like 'hero\_%' escape '\' loop
  execute format('drop function public.%I(%s)',item.proname,item.args);
 end loop;
 for item in select c.conname,c.conrelid::regclass as relation from pg_constraint c where c.connamespace='public'::regnamespace and c.conname like '%hero%' loop
  execute format('alter table %s rename constraint %I to %I',item.relation,item.conname,replace(item.conname,'hero','yourday'));
 end loop;
 for item in select relname from pg_class where relnamespace='public'::regnamespace and relkind='i' and relname like '%hero%' loop
  execute format('alter index public.%I rename to %I',item.relname,replace(item.relname,'hero','yourday'));
 end loop;
 for item in select schemaname,tablename,policyname from pg_policies where policyname like '%hero%' loop
  execute format('alter policy %I on %I.%I rename to %I',item.policyname,item.schemaname,item.tablename,replace(item.policyname,'hero','yourday'));
 end loop;
 for item in select jobid,jobname,schedule,command from cron.job where jobname like '%hero%' loop
  perform cron.unschedule(item.jobid);
  perform cron.schedule(replace(item.jobname,'hero','yourday'),item.schedule,replace(replace(item.command,'hero-ai','yourday-ai'),'hero_ai','yourday_ai'));
 end loop;
 for item in select id,name from vault.secrets where name like '%hero%' loop
  -- Installed vault.update_secret keeps s.secret when new_secret is omitted.
  perform vault.update_secret(secret_id := item.id, new_name := replace(item.name,'hero','yourday'));
 end loop;
end;
$rename$;
notify pgrst,'reload schema';
commit;
