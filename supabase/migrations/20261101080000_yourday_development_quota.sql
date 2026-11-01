begin;
select pg_advisory_xact_lock(2801028);
alter table public.yourday_ai_jobs add column if not exists is_development boolean not null default false;

-- Only the service role can set p_development, after verifying the developer secret.
-- Keep the old signatures as production-only wrappers for already installed apps.
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
 select greatest(0,1-count(*)::integer) into result from public.yourday_ai_outputs o
 join public.yourday_ai_jobs j on j.id=o.job_id
 where j.user_id=p_user and not j.is_development
 and j.day=(now() at time zone 'Asia/Seoul')::date and o.state<>'failed';
 return result;
end;
$$;

create or replace function public.yourday_ai_reserve(p_user uuid,p_id text,p_mode text,p_count integer,p_development boolean) returns void
language plpgsql security definer set search_path='' as $$
declare existing public.yourday_ai_jobs; global_used integer; max_global integer; development boolean:=coalesce(p_development,false);
begin
 if p_user is null or p_count is null or p_count not between 1 and 3 or p_mode is null or p_mode not in ('face','photo') then raise exception 'invalid_request'; end if;
 perform pg_advisory_xact_lock(2801028);
 select * into existing from public.yourday_ai_jobs where id=p_id;
 if found then
  if existing.user_id<>p_user or existing.count<>p_count or existing.mode<>p_mode or existing.is_development<>development then raise exception 'request_conflict'; end if;
  return;
 end if;
 if public.yourday_ai_remaining(p_user,development)<p_count then raise exception 'daily_limit'; end if;
 select count(*) into global_used from public.yourday_ai_outputs o join public.yourday_ai_jobs j on j.id=o.job_id
 where j.day=(now() at time zone 'Asia/Seoul')::date and o.state<>'failed';
 select global_daily into max_global from public.yourday_ai_limits where singleton;
 if global_used+p_count>max_global then raise exception 'service_limit'; end if;
 insert into public.yourday_ai_jobs(id,user_id,mode,count,is_development) values(p_id,p_user,p_mode,p_count,development);
 insert into public.yourday_ai_outputs(job_id,index) select p_id,generate_series(0,p_count-1);
end;
$$;

create or replace function public.yourday_ai_claim(p_user uuid,p_id text,p_index integer,p_development boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare changed integer; attempts integer; allowed integer; development_job boolean;
begin
 perform pg_advisory_xact_lock(2801028);
 select j.is_development into development_job from public.yourday_ai_outputs o join public.yourday_ai_jobs j on j.id=o.job_id
 where o.job_id=p_id and o.index=p_index and j.user_id=p_user and o.state='reserved' and j.created_at>now()-interval '20 minutes';
 if not found then return false; end if;
 if development_job and not coalesce(p_development,false) then raise exception 'daily_limit'; end if;
 if not coalesce(p_development,false) then
  select count(*) into attempts from public.yourday_ai_outputs o join public.yourday_ai_jobs j on j.id=o.job_id
  where j.user_id=p_user and not j.is_development and j.day=(now() at time zone 'Asia/Seoul')::date
  and o.started_at is not null and o.state<>'failed';
  if attempts>=6 then raise exception 'attempt_limit'; end if;
 end if;
 -- Retain the shared upstream budget even during developer testing.
 select count(*) into attempts from public.yourday_ai_outputs o join public.yourday_ai_jobs j on j.id=o.job_id
 where j.day=(now() at time zone 'Asia/Seoul')::date and o.started_at is not null;
 select global_daily*2 into allowed from public.yourday_ai_limits where singleton;
 if attempts>=allowed then raise exception 'service_limit'; end if;
 update public.yourday_ai_outputs o set state='processing',started_at=now()
 from public.yourday_ai_jobs j where j.id=o.job_id and j.user_id=p_user and o.job_id=p_id and o.index=p_index
 and o.state='reserved' and j.created_at>now()-interval '20 minutes';
 get diagnostics changed=row_count;
 return changed=1;
end;
$$;

create or replace function public.yourday_ai_confirm_saved(p_user uuid,p_id text,p_indices integer[],p_development boolean) returns integer
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(2801028);
 if not exists(select 1 from public.yourday_ai_jobs where id=p_id and user_id=p_user) then raise exception 'not_found'; end if;
 update public.yourday_ai_outputs o set delivered_at=coalesce(o.delivered_at,now())
 where o.job_id=p_id and o.index=any(p_indices) and o.state='completed';
 return public.yourday_ai_remaining(p_user,p_development);
end;
$$;

create or replace function public.yourday_ai_remaining(p_user uuid) returns integer
language sql security definer set search_path='' as $$ select public.yourday_ai_remaining(p_user,false); $$;
create or replace function public.yourday_ai_reserve(p_user uuid,p_id text,p_mode text,p_count integer) returns void
language sql security definer set search_path='' as $$ select public.yourday_ai_reserve(p_user,p_id,p_mode,p_count,false); $$;
create or replace function public.yourday_ai_claim(p_user uuid,p_id text,p_index integer) returns boolean
language sql security definer set search_path='' as $$ select public.yourday_ai_claim(p_user,p_id,p_index,false); $$;
create or replace function public.yourday_ai_confirm_saved(p_user uuid,p_id text,p_indices integer[]) returns integer
language sql security definer set search_path='' as $$ select public.yourday_ai_confirm_saved(p_user,p_id,p_indices,false); $$;

revoke all on function public.yourday_ai_remaining(uuid,boolean),public.yourday_ai_reserve(uuid,text,text,integer,boolean),public.yourday_ai_claim(uuid,text,integer,boolean),public.yourday_ai_confirm_saved(uuid,text,integer[],boolean),public.yourday_ai_remaining(uuid),public.yourday_ai_reserve(uuid,text,text,integer),public.yourday_ai_claim(uuid,text,integer),public.yourday_ai_confirm_saved(uuid,text,integer[]) from public,anon,authenticated;
grant execute on function public.yourday_ai_remaining(uuid,boolean),public.yourday_ai_reserve(uuid,text,text,integer,boolean),public.yourday_ai_claim(uuid,text,integer,boolean),public.yourday_ai_confirm_saved(uuid,text,integer[],boolean),public.yourday_ai_remaining(uuid),public.yourday_ai_reserve(uuid,text,text,integer),public.yourday_ai_claim(uuid,text,integer),public.yourday_ai_confirm_saved(uuid,text,integer[]) to service_role;
notify pgrst,'reload schema';
commit;
