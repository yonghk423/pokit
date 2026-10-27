import type { AnnouncementLocale } from '../model/types';

/** 공지 테이블에 없는 앱 언어(번체 등)는 영어 공지를 본다. */
export function toAnnouncementLocale(locale: string): AnnouncementLocale {
  if (locale === 'ko' || locale === 'ja') return locale;
  return 'en';
}

/** 앱 로케일에 맞는 공지 locale. 없으면 en으로 폴백. */
export function resolveAnnouncementLocales(preferred: AnnouncementLocale): AnnouncementLocale[] {
  if (preferred === 'en') return ['en'];
  return [preferred, 'en'];
}
