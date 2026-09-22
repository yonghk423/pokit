import type { AnnouncementLocale } from '../model/types';

/** 앱 로케일에 맞는 공지 locale. 없으면 en으로 폴백. */
export function resolveAnnouncementLocales(preferred: AnnouncementLocale): AnnouncementLocale[] {
  if (preferred === 'en') return ['en'];
  return [preferred, 'en'];
}
