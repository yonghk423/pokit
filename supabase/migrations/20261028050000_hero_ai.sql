begin;
create table if not exists public.hero_ai_jobs (
 id text primary key check (id ~ '^[a-zA-Z0-9-]{8,80}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null default (now() at time zone 'Asia/Seoul')::date,
 mode text not null check (mode in ('face','photo')),
 count integer not null check (count between 1 and 3),
 created_at timestamptz not null default now()
);
create table if not exists public.hero_ai_outputs (
 job_id text not null references public.hero_ai_jobs(id) on delete cascade,
 index integer not null check (index between 0 and 2),
 state text not null default 'reserved' check (state in ('reserved','processing','completed','failed','uncertain')),
 object_path text, error text, started_at timestamptz,
 primary key(job_id,index)
);
create index if not exists hero_ai_jobs_user_day on public.hero_ai_jobs(user_id,day);
create table if not exists public.hero_ai_limits (
 singleton boolean primary key default true check(singleton),
 global_daily integer not null default 100 check(global_daily between 3 and 100000)
);
insert into public.hero_ai_limits(singleton) values(true) on conflict do nothing;
alter table public.hero_ai_jobs enable row level security;
alter table public.hero_ai_outputs enable row level security;
alter table public.hero_ai_limits enable row level security;
revoke all on public.hero_ai_jobs, public.hero_ai_outputs, public.hero_ai_limits from public, anon, authenticated;
grant all on public.hero_ai_jobs, public.hero_ai_outputs, public.hero_ai_limits to service_role;
create or replace function public.hero_ai_remaining(p_user uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare result integer;
begin
 update public.hero_ai_outputs o set state='failed',error='expired'
 from public.hero_ai_jobs j where j.id=o.job_id and o.state='reserved' and j.created_at<now()-interval '20 minutes';
 select greatest(0,3-count(*)::integer) into result from public.hero_ai_outputs o
 join public.hero_ai_jobs j on j.id=o.job_id
 where j.user_id=p_user and j.day=(now() at time zone 'Asia/Seoul')::date and o.state<>'failed';
 return result;
end;
$$;
create or replace function public.hero_ai_reserve(p_user uuid,p_id text,p_mode text,p_count integer) returns void
language plpgsql security definer set search_path = '' as $$
declare existing public.hero_ai_jobs; global_used integer; max_global integer;
begin
 if p_user is null or p_count not between 1 and 3 or p_mode not in ('face','photo') then raise exception 'invalid_request'; end if;
 -- Serialize quota reservation across all workers; never rely on client counters.
 perform pg_advisory_xact_lock(2801028);
 select * into existing from public.hero_ai_jobs where id=p_id;
 if found then
  if existing.user_id<>p_user or existing.count<>p_count or existing.mode<>p_mode then raise exception 'request_conflict'; end if;
  return;
 end if;
 -- No upstream request was made for expired, unclaimed reservations.
 update public.hero_ai_outputs o set state='failed',error='expired'
 from public.hero_ai_jobs j where j.id=o.job_id and o.state='reserved' and j.created_at<now()-interval '20 minutes';
 if public.hero_ai_remaining(p_user)<p_count then raise exception 'daily_limit'; end if;
 select count(*) into global_used from public.hero_ai_outputs o join public.hero_ai_jobs j on j.id=o.job_id
 where j.day=(now() at time zone 'Asia/Seoul')::date and o.state<>'failed';
 select global_daily into max_global from public.hero_ai_limits where singleton;
 if global_used+p_count>max_global then raise exception 'service_limit'; end if;
 insert into public.hero_ai_jobs(id,user_id,mode,count) values(p_id,p_user,p_mode,p_count);
 insert into public.hero_ai_outputs(job_id,index) select p_id,generate_series(0,p_count-1);
end;
$$;
create or replace function public.hero_ai_claim(p_user uuid,p_id text,p_index integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed integer; attempts integer; allowed integer;
begin
 perform pg_advisory_xact_lock(2801028);
 if not exists(select 1 from public.hero_ai_outputs o join public.hero_ai_jobs j on j.id=o.job_id where o.job_id=p_id and o.index=p_index and j.user_id=p_user and o.state='reserved' and j.created_at>now()-interval '20 minutes') then return false; end if;
 select count(*) into attempts from public.hero_ai_outputs o join public.hero_ai_jobs j on j.id=o.job_id
 where j.user_id=p_user and j.day=(now() at time zone 'Asia/Seoul')::date and o.started_at is not null;
 if attempts>=6 then raise exception 'attempt_limit'; end if;
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
$$;
revoke all on function public.hero_ai_remaining(uuid), public.hero_ai_reserve(uuid,text,text,integer), public.hero_ai_claim(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.hero_ai_remaining(uuid), public.hero_ai_reserve(uuid,text,text,integer), public.hero_ai_claim(uuid,text,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hero-ai-results','hero-ai-results',false,20000000,array['image/png']) on conflict(id) do nothing;
commit;
