-- Authorized testing window until 2026-10-31 00:00 Asia/Seoul.
-- Global budget and authentication remain enforced.
begin;
CREATE OR REPLACE FUNCTION public.hero_ai_claim(p_user uuid, p_id text, p_index integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare changed integer; attempts integer; allowed integer;
begin
 perform pg_advisory_xact_lock(2801028);
 if not exists(select 1 from public.hero_ai_outputs o join public.hero_ai_jobs j on j.id=o.job_id where o.job_id=p_id and o.index=p_index and j.user_id=p_user and o.state='reserved' and j.created_at>now()-interval '20 minutes') then return false; end if;
 select count(*) into attempts from public.hero_ai_outputs o join public.hero_ai_jobs j on j.id=o.job_id
 where j.user_id=p_user and j.day=(now() at time zone 'Asia/Seoul')::date and o.started_at is not null;
 if now() >= timestamptz '2026-10-31 00:00:00+09' and attempts>=6 then raise exception 'attempt_limit'; end if;
 select count(*) into attempts from public.hero_ai_outputs o join public.hero_ai_jobs j on j.id=o.job_id
 where j.day=(now() at time zone 'Asia/Seoul')::date and o.started_at is not null;
 select global_daily*2 into allowed from public.hero_ai_limits where singleton;
 if attempts>=allowed then raise exception 'service_limit'; end if;
 update public.hero_ai_outputs o set state='processing',started_at=now()
 from public.hero_ai_jobs j where j.id=o.job_id and j.user_id=p_user and o.job_id=p_id and o.index=p_index
 and o.state='reserved' and j.created_at>now()-interval '20 minutes';
 get diagnostics changed=row_count;
 return changed=1;
end;
$function$;

CREATE OR REPLACE FUNCTION public.hero_ai_remaining(p_user uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result integer;
begin
 update public.hero_ai_outputs o set state='failed',error='expired'
 from public.hero_ai_jobs j where j.id=o.job_id and o.state='reserved' and j.created_at<now()-interval '20 minutes';
 -- Temporary test window; standard quota resumes automatically at Seoul midnight.
 if now() < timestamptz '2026-10-31 00:00:00+09' then return 100000; end if;
 select greatest(0,3-count(*)::integer) into result from public.hero_ai_outputs o
 join public.hero_ai_jobs j on j.id=o.job_id
 where j.user_id=p_user and j.day=(now() at time zone 'Asia/Seoul')::date and o.state<>'failed';
 return result;
end;
$function$;
commit;
