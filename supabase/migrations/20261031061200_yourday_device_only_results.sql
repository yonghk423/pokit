begin;
-- No server-side image storage remains in the active generation function.
-- Existing images are deliberately preserved pending explicit deletion approval.
do $$
declare item record;
begin
 for item in select jobid from cron.job where jobname in ('yourday-ai-result-cleanup','hero-ai-result-cleanup') loop
  perform cron.unschedule(item.jobid);
 end loop;
end;
$$;
drop function if exists public.yourday_ai_authorize_cleanup(text);
notify pgrst,'reload schema';
commit;
