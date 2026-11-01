-- Authorized 24-hour extension. Only the expiry changes; quota accounting,
-- delivery recovery, ownership and service-wide budget checks stay intact.
begin;
do $dev_window$
declare
  function_id regprocedure;
  definition text;
  old_expiry text := '2026-11-01 00:00:00+09';
  new_expiry text := to_char((statement_timestamp() + interval '24 hours') at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') || '+09';
begin
  perform pg_advisory_xact_lock(2801028);
  foreach function_id in array array[
    'public.yourday_ai_remaining(uuid)'::regprocedure,
    'public.yourday_ai_claim(uuid,text,integer)'::regprocedure
  ] loop
    definition := pg_get_functiondef(function_id);
    if (length(definition) - length(replace(definition, old_expiry, ''))) / length(old_expiry) <> 1 then
      raise exception 'Expected exactly one development-window expiry in %', function_id;
    end if;
    execute replace(definition, old_expiry, new_expiry);
    if position(new_expiry in pg_get_functiondef(function_id)) = 0 then
      raise exception 'Expiry update failed in %', function_id;
    end if;
  end loop;
  perform set_config('pokit.quota_window_expires_at', new_expiry, true);
end;
$dev_window$;
select current_setting('pokit.quota_window_expires_at') as personal_quota_resumes_at;
commit;
