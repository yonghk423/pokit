-- Transaction-only regression check: never calls an image provider, always rolls back.
begin;
do $test$
declare u uuid:=gen_random_uuid(); a text:='receipt-a-'||gen_random_uuid(); b text:='receipt-b-'||gen_random_uuid(); c text:='receipt-c-'||gen_random_uuid(); d text:='receipt-d-'||gen_random_uuid(); definition text;
begin
 -- Exercise normal quota even while the developer bypass is active; rollback restores it.
 definition:=pg_get_functiondef('public.yourday_ai_remaining(uuid)'::regprocedure);
 execute replace(replace(definition,'if now()<timestamptz ''2026-11-01 00:00:00+09'' then return 100000; end if;',''),'if now()<timestamptz ''2026-11-02 00:00:00+09'' then return 100000; end if;','');
 insert into auth.users(id) values(u);
 insert into public.yourday_ai_jobs(id,user_id,mode,count) values(a,u,'photo',1),(b,u,'photo',1),(c,u,'photo',1),(d,u,'photo',1);
 insert into public.yourday_ai_outputs(job_id,index,state,started_at) values(a,0,'completed',now());
 if public.yourday_ai_remaining(u)<>2 then raise exception 'Active reservation missing'; end if;
 if public.yourday_ai_confirm_saved(u,a,array[0])<>2 then raise exception 'Saved image charged incorrectly'; end if;
 if public.yourday_ai_confirm_saved(u,a,array[0])<>2 then raise exception 'Duplicate receipt charged twice'; end if;
 update public.yourday_ai_outputs set state='failed' where job_id=a and delivered_at is null;
 if not exists(select 1 from public.yourday_ai_outputs where job_id=a and state='completed' and delivered_at is not null) then raise exception 'Confirmed result refunded incorrectly'; end if;
 insert into public.yourday_ai_outputs(job_id,index,state,started_at) values(b,0,'failed',now()),(c,0,'processing',now()-interval '11 minutes'),(d,0,'completed',now()-interval '8 days');
 if public.yourday_ai_remaining(u)<>2 then raise exception 'Failure/interruption consumed quota'; end if;
 if exists(select 1 from public.yourday_ai_outputs where job_id in(c,d) and state<>'failed') then raise exception 'Unacknowledged result not released'; end if;
 if has_function_privilege('authenticated','public.yourday_ai_confirm_saved(uuid,text,integer[])','EXECUTE') then raise exception 'Direct public receipt access'; end if;
 begin
  perform public.yourday_ai_confirm_saved(gen_random_uuid(),a,array[0]);
  raise exception 'Cross-user receipt accepted';
 exception when others then
  if sqlerrm<>'not_found' then raise; end if;
 end;
end;
$test$;
rollback;
select 'receipt, refund, expiry, idempotency and ownership checks passed' as result;
