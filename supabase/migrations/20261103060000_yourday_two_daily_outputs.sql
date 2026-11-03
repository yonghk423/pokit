-- Two successful outputs per account and Asia/Seoul calendar day.
-- Existing reservations, refunds, developer scope and service budget are preserved.
begin;
select pg_advisory_xact_lock(2801028);
create or replace function public.yourday_ai_remaining(p_user uuid,p_development boolean) returns integer
language plpgsql security definer set search_path='' as $$
declare result integer;
begin
 update public.yourday_ai_outputs o set state='failed',error='interrupted'
 from public.yourday_ai_jobs j where j.id=o.job_id and o.delivered_at is null and
 ((o.state='processing' and o.started_at<now()-interval '10 minutes')
 or (o.state='reserved' and j.created_at<now()-interval '20 minutes')
 or (o.state='completed' and coalesce(o.completed_at,o.started_at,j.created_at)<now()-interval '7 days'));
 if coalesce(p_development,false) then return 100000; end if;
 select greatest(0,2-count(*)::integer) into result from public.yourday_ai_outputs o
 join public.yourday_ai_jobs j on j.id=o.job_id
 where j.user_id=p_user and not j.is_development
 and j.day=(now() at time zone 'Asia/Seoul')::date and o.state<>'failed';
 return result;
end;
$$;
commit;
