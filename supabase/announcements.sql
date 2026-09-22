-- POKIT announcements (read-only for the app via anon key)
-- Run once in Supabase SQL Editor, then verify in Table Editor.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('ko', 'en', 'ja')),
  title text not null,
  body text not null,
  priority text not null default 'info' check (priority in ('info', 'important', 'force')),
  published_at timestamptz not null default now(),
  expires_at timestamptz null,
  is_active boolean not null default true,
  link_url text null,
  created_at timestamptz not null default now()
);

create index if not exists announcements_active_locale_published_idx
  on public.announcements (locale, published_at desc)
  where is_active = true;

alter table public.announcements enable row level security;

drop policy if exists "public can read active announcements" on public.announcements;
create policy "public can read active announcements"
on public.announcements
for select
to anon
using (
  is_active = true
  and published_at <= now()
  and (expires_at is null or expires_at > now())
);

grant select on public.announcements to anon;

-- Sample rows (one per locale). Safe to re-run only if table is empty;
-- otherwise insert from Table Editor instead.
insert into public.announcements (locale, title, body, priority)
select *
from (
  values
    (
      'ko',
      'POKIT 공지 연동 테스트',
      '설정 → 공지사항에서 이 글이 보이면 Supabase 공지 연동이 성공한 거예요.',
      'important'
    ),
    (
      'en',
      'POKIT announcement smoke test',
      'If you see this under Settings → Announcements, Supabase notices are working.',
      'important'
    ),
    (
      'ja',
      'POKITお知らせの接続テスト',
      '設定 → お知らせにこの文が表示されれば、Supabase連携は成功です。',
      'important'
    )
) as seed(locale, title, body, priority)
where not exists (select 1 from public.announcements limit 1);
