-- Development-only extension requested on 2026-10-31.
-- Personal quota resumes at 2026-11-01 00:00 Asia/Seoul.
-- Preserve service-wide limits, ownership checks and job accounting.
begin;
do $dev_window$
declare function_id regprocedure; definition text;
begin
 foreach function_id in array array[
   'public.yourday_ai_remaining(uuid)'::regprocedure,
   'public.yourday_ai_claim(uuid,text,integer)'::regprocedure
 ] loop
   definition := pg_get_functiondef(function_id);
   if position('2026-10-31 00:00:00+09' in definition) = 0 then
     raise exception 'Expected development-window expiry missing in %', function_id;
   end if;
   execute replace(definition, '2026-10-31 00:00:00+09', '2026-11-01 00:00:00+09');
 end loop;
end;
$dev_window$;
commit;
