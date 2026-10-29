begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule('hero-ai-result-cleanup','*/30 * * * *',
 $task$select net.http_post(
   url := 'https://wvvtyaxsedpqiscogrwk.supabase.co/functions/v1/hero-ai/cleanup',
   headers := jsonb_build_object('Content-Type','application/json','x-cleanup-token',
     (select decrypted_secret from vault.decrypted_secrets where name='hero_ai_cleanup_token' limit 1)),
   body := '{}'::jsonb, timeout_milliseconds := 10000
 );$task$);
commit;
