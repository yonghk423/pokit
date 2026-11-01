begin;
alter table public.yourday_ai_outputs add column if not exists delivered_at timestamptz;
-- Preserve accounting for results completed before the receipt protocol existed.
update public.yourday_ai_outputs o set delivered_at=coalesce(o.started_at,j.created_at)
from public.yourday_ai_jobs j where j.id=o.job_id and o.state='completed' and o.delivered_at is null;
create or replace function public.yourday_ai_remaining(p_user uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare result integer;
begin
 update public.yourday_ai_outputs o set state='failed',error='interrupted'
 from public.yourday_ai_jobs j where j.id=o.job_id and o.delivered_at is null and o.state<>'failed'
 and ((o.started_at is not null and o.started_at<now()-interval '3 minutes')
   or (o.started_at is null and j.created_at<now()-interval '20 minutes'));
 if now()<timestamptz '2026-11-01 00:00:00+09' then return 100000; end if;
 select greatest(0,3-count(*)::integer) into result from public.yourday_ai_outputs o
 join public.yourday_ai_jobs j on j.id=o.job_id
 where j.user_id=p_user and j.day=(now() at time zone 'Asia/Seoul')::date and o.state<>'failed';
 return result;
end;
$$;
create or replace function public.yourday_ai_confirm_saved(p_user uuid,p_id text,p_indices integer[]) returns integer
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(2801028);
 if not exists(select 1 from public.yourday_ai_jobs where id=p_id and user_id=p_user) then raise exception 'not_found'; end if;
 update public.yourday_ai_outputs o set delivered_at=coalesce(o.delivered_at,now())
 where o.job_id=p_id and o.index=any(p_indices) and o.state='completed';
 return public.yourday_ai_remaining(p_user);
end;
$$;
-- Failed/interrupted requests do not block the user's retries. Retain the
-- service-wide upstream-attempt guard to count actual requests made to OpenAI.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.yourday_ai_claim(uuid,text,integer)'::regprocedure);
 definition:=replace(definition,
  'where j.user_id=p_user and j.day=(now() at time zone ''Asia/Seoul'')::date and o.started_at is not null;',
  'where j.user_id=p_user and j.day=(now() at time zone ''Asia/Seoul'')::date and o.started_at is not null and o.state<>''failed'';');
 execute definition;
end;
$$;
revoke all on function public.yourday_ai_confirm_saved(uuid,text,integer[]) from public,anon,authenticated;
grant execute on function public.yourday_ai_confirm_saved(uuid,text,integer[]) to service_role;
notify pgrst,'reload schema';
commit;
