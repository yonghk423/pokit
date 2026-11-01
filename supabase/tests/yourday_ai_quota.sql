-- No provider calls or lasting changes: everything is rolled back.
begin;
select pg_advisory_xact_lock(2801028);
update public.yourday_ai_limits set global_daily=100000 where singleton;
do $test$
declare u uuid:=gen_random_uuid(); a text:='quota-test-'||gen_random_uuid(); b text:='quota-test-'||gen_random_uuid();
 dev text:='quota-dev-'||gen_random_uuid(); next_id text; n integer; global_used integer;
begin
 insert into auth.users(id) values(u);
 if has_table_privilege('authenticated','public.yourday_ai_jobs','SELECT') then raise exception 'Unexpected direct job access'; end if;
 if has_function_privilege('authenticated','public.yourday_ai_reserve(uuid,text,text,integer,boolean)','EXECUTE')
 or has_function_privilege('anon','public.yourday_ai_remaining(uuid,boolean)','EXECUTE') then raise exception 'Public developer bypass'; end if;
 if public.yourday_ai_remaining(u)<>1 then raise exception 'Production allowance is not one'; end if;
 begin
  perform public.yourday_ai_reserve(u,b,'photo',2);
  raise exception 'Production batch bypassed quota';
 exception when others then if sqlerrm<>'daily_limit' then raise; end if; end;
 perform public.yourday_ai_reserve(u,a,'photo',1);
 perform public.yourday_ai_reserve(u,a,'photo',1);
 if public.yourday_ai_remaining(u)<>0 then raise exception 'Incorrect reservation count'; end if;
 begin
  perform public.yourday_ai_reserve(u,b,'photo',1);
  raise exception 'Second production reservation succeeded';
 exception when others then if sqlerrm<>'daily_limit' then raise; end if; end;
 if not public.yourday_ai_claim(u,a,0) then raise exception 'First claim failed'; end if;
 if public.yourday_ai_claim(u,a,0) then raise exception 'Duplicate claim succeeded'; end if;
 if public.yourday_ai_claim(gen_random_uuid(),a,0) then raise exception 'Cross-user claim succeeded'; end if;
 update public.yourday_ai_outputs set state='failed' where job_id=a;
 if public.yourday_ai_remaining(u)<>1 then raise exception 'Failure consumed quota'; end if;
 perform public.yourday_ai_reserve(u,dev,'photo',3,true);
 if public.yourday_ai_remaining(u,true)<>100000 then raise exception 'Development allowance not unlimited'; end if;
 if public.yourday_ai_remaining(u)<>1 then raise exception 'Development used production allowance'; end if;
 begin
  perform public.yourday_ai_claim(u,dev,0);
  raise exception 'Development job claimed without developer scope';
 exception when others then if sqlerrm<>'daily_limit' then raise; end if; end;
 if not public.yourday_ai_claim(u,dev,0,true) then raise exception 'Developer claim failed'; end if;
 for n in 1..8 loop
  next_id:='quota-dev-'||gen_random_uuid();
  perform public.yourday_ai_reserve(u,next_id,'photo',1,true);
  if not public.yourday_ai_claim(u,next_id,0,true) then raise exception 'Developer attempt capped'; end if;
 end loop;
 if public.yourday_ai_remaining(u)<>1 then raise exception 'Developer attempts used production allowance'; end if;
 perform public.yourday_ai_reserve(u,b,'photo',1);
 if public.yourday_ai_remaining(u)<>0 then raise exception 'Production slot was not reserved'; end if;
 update public.yourday_ai_jobs set created_at=now()-interval '21 minutes' where id=b;
 if public.yourday_ai_remaining(u)<>1 then raise exception 'Expired reservation not released'; end if;
 -- Developer credentials do not disable the shared service budget.
 select count(*) into global_used from public.yourday_ai_outputs o join public.yourday_ai_jobs j on j.id=o.job_id
 where j.day=(now() at time zone 'Asia/Seoul')::date and o.state<>'failed';
 update public.yourday_ai_limits set global_daily=global_used where singleton;
 begin
  perform public.yourday_ai_reserve(u,'quota-budget-'||gen_random_uuid(),'photo',1,true);
  raise exception 'Shared service budget bypassed';
 exception when others then if sqlerrm<>'service_limit' then raise; end if; end;
end;
$test$;
rollback;
select 'production quota, developer separation, refunds, ownership and shared budget passed' as result;
