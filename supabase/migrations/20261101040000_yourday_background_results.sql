begin;
alter table public.yourday_ai_outputs add column if not exists completed_at timestamptz;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('yourday-ai-results','yourday-ai-results',false,20971520,array['image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.yourday_ai_remaining(p_user uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare result integer;
begin
 update public.yourday_ai_outputs o set state='failed',error='interrupted'
 from public.yourday_ai_jobs j where j.id=o.job_id and o.delivered_at is null and
 ((o.state='processing' and o.started_at<now()-interval '10 minutes')
 or (o.state='reserved' and j.created_at<now()-interval '20 minutes')
 or (o.state='completed' and coalesce(o.completed_at,o.started_at,j.created_at)<now()-interval '7 days'));
 select greatest(0,3-count(*)::integer) into result from public.yourday_ai_outputs o
 join public.yourday_ai_jobs j on j.id=o.job_id
 where j.user_id=p_user and j.day=(now() at time zone 'Asia/Seoul')::date and o.state<>'failed';
 return result;
end;
$$;
-- A private, scheduler-only credential is created without exporting its value.
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'yourday_ai_cleanup_token')
where not exists(select 1 from vault.secrets where name='yourday_ai_cleanup_token');
create or replace function public.yourday_ai_authorize_cleanup(p_token text) returns boolean
language sql security definer set search_path='' as $$
 select p_token is not null and exists(select 1 from vault.decrypted_secrets
 where name='yourday_ai_cleanup_token' and decrypted_secret=p_token);
$$;
revoke all on function public.yourday_ai_authorize_cleanup(text) from public,anon,authenticated;
grant execute on function public.yourday_ai_authorize_cleanup(text) to service_role;
select cron.schedule('yourday-ai-result-cleanup','*/30 * * * *',
$cron$select net.http_post(
 url:='https://wvvtyaxsedpqiscogrwk.supabase.co/functions/v1/yourday-ai/cleanup',
 headers:=jsonb_build_object('Content-Type','application/json','x-cleanup-token',
 (select decrypted_secret from vault.decrypted_secrets where name='yourday_ai_cleanup_token' limit 1)),
 body:='{}'::jsonb);$cron$);
notify pgrst,'reload schema';
commit;
