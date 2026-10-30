begin;
create table if not exists public.hero_ai_notifications (
 job_id text primary key references public.hero_ai_jobs(id) on delete cascade,
 push_token text not null check (length(push_token) between 20 and 250),
 locale text not null default 'ko' check (locale in ('ko','en','ja','zh-TW')),
 claimed_at timestamptz,
 ticket_id text,
 error text
);
alter table public.hero_ai_notifications enable row level security;
revoke all on public.hero_ai_notifications from public, anon, authenticated;
grant all on public.hero_ai_notifications to service_role;
commit;
