import { getSupabaseClient, isSupabaseConfigured } from '@shared/lib/supabase';

import { resolveAnnouncementLocales } from '../lib/resolveAnnouncementLocales';
import type { Announcement, AnnouncementLocale, AnnouncementPriority } from '../model/types';

type AnnouncementRow = {
  id: string;
  locale: string;
  title: string;
  body: string;
  priority: string;
  published_at: string;
  expires_at: string | null;
  link_url: string | null;
};

export type FetchAnnouncementsResult =
  | { ok: true; items: Announcement[] }
  | { ok: false; message: string };

function asPriority(value: string): AnnouncementPriority {
  if (value === 'important' || value === 'force') return value;
  return 'info';
}

function asLocale(value: string): AnnouncementLocale | null {
  if (value === 'ko' || value === 'en' || value === 'ja') return value;
  return null;
}

function mapRow(row: AnnouncementRow): Announcement | null {
  const locale = asLocale(row.locale);
  if (!locale) return null;
  return {
    id: row.id,
    locale,
    title: row.title,
    body: row.body,
    priority: asPriority(row.priority),
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    linkUrl: row.link_url,
  };
}

async function selectByLocale(locale: AnnouncementLocale): Promise<FetchAnnouncementsResult> {
  const { data, error } = await getSupabaseClient()
    .from('announcements')
    .select('id, locale, title, body, priority, published_at, expires_at, link_url')
    .eq('locale', locale)
    .order('published_at', { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const items = ((data ?? []) as AnnouncementRow[])
    .map(mapRow)
    .filter((item): item is Announcement => item != null);

  return { ok: true, items };
}

/** 활성·기간 내 공지 (RLS)를 로케일 우선순위로 조회 */
export async function fetchAnnouncements(
  preferredLocale: AnnouncementLocale,
): Promise<FetchAnnouncementsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase env가 비어 있어요.' };
  }

  try {
    for (const locale of resolveAnnouncementLocales(preferredLocale)) {
      const result = await selectByLocale(locale);
      if (!result.ok) return result;
      if (result.items.length > 0) return result;
    }
    return { ok: true, items: [] };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}
