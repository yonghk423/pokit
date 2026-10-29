-- Run in a transaction after setting hero_ai.test_user to an authenticated test user's UUID.
-- The caller wraps this file in BEGIN / ROLLBACK, so no quota is consumed.
do $$
declare u uuid := current_setting('hero_ai.test_user')::uuid;
 a text := 'quota-test-'||replace(gen_random_uuid()::text,'-','');
 b text := 'quota-test-'||replace(gen_random_uuid()::text,'-','');
 c text; n integer;
begin
 if has_table_privilege('authenticated','public.hero_ai_jobs','SELECT') then raise exception 'Unexpected direct job access'; end if;
 if has_function_privilege('authenticated','public.hero_ai_reserve(uuid,text,text,integer)','EXECUTE') then raise exception 'Unexpected quota RPC access'; end if;
 perform public.hero_ai_reserve(u,a,'face',3);
 perform public.hero_ai_reserve(u,a,'face',3); -- idempotent retry
 if public.hero_ai_remaining(u)<>0 then raise exception 'Incorrect reservation count'; end if;
 begin
  perform public.hero_ai_reserve(u,b,'photo',1);
  raise exception 'Quota was bypassed';
 exception when others then if sqlerrm<>'daily_limit' then raise; end if; end;
 if not public.hero_ai_claim(u,a,0) then raise exception 'First claim failed'; end if;
 if public.hero_ai_claim(u,a,0) then raise exception 'Duplicate claim succeeded'; end if;
 if public.hero_ai_claim(gen_random_uuid(),a,1) then raise exception 'Cross-user claim succeeded'; end if;
 update public.hero_ai_outputs set state='failed' where job_id=a and index=2;
 if public.hero_ai_remaining(u)<>1 then raise exception 'Rejected output was charged'; end if;
 perform public.hero_ai_reserve(u,b,'photo',1);
 if public.hero_ai_remaining(u)<>0 then raise exception 'Quota was not re-reserved'; end if;
 update public.hero_ai_jobs set created_at=now()-interval '21 minutes' where id=a;
 if public.hero_ai_remaining(u)<>1 then raise exception 'Unclaimed expiry or uncertain charge is incorrect'; end if;
 update public.hero_ai_outputs o set state='failed' from public.hero_ai_jobs j where j.id=o.job_id and j.user_id=u;
 for n in 1..5 loop
  c := 'attempt-test-'||replace(gen_random_uuid()::text,'-','');
  perform public.hero_ai_reserve(u,c,'photo',1);
  if not public.hero_ai_claim(u,c,0) then raise exception 'Attempt claim failed'; end if;
  update public.hero_ai_outputs set state='failed' where job_id=c;
 end loop;
 c := 'attempt-test-'||replace(gen_random_uuid()::text,'-','');
 perform public.hero_ai_reserve(u,c,'photo',1);
 begin
  perform public.hero_ai_claim(u,c,0);
  raise exception 'Attempt limit was bypassed';
 exception when others then if sqlerrm<>'attempt_limit' then raise; end if; end;
end;
$$;
