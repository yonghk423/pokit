export const SUPPORTED_APP_LOCALES = ['ko', 'en', 'ja', 'zh-TW'] as const;

export type AppLocale = (typeof SUPPORTED_APP_LOCALES)[number];

export function detectDeviceLanguageTag(): string {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  if (typeof locale === 'string' && locale.trim().length > 0) {
    return locale;
  }
  return 'en';
}

/** 기기 언어 태그를 앱 지원 언어로 축약한다. 간체(zh-CN 등)는 영어 폴백. */
export function resolveAppLocaleFromLanguageTag(languageTag: string | null | undefined): AppLocale {
  const tag = typeof languageTag === 'string' ? languageTag.trim().toLowerCase() : '';
  if (tag.startsWith('ko')) return 'ko';
  if (tag.startsWith('ja')) return 'ja';
  if (tag.startsWith('zh-tw') || tag.startsWith('zh-hant') || tag.startsWith('zh-hk') || tag.startsWith('zh-mo')) return 'zh-TW';
  if (tag.startsWith('en')) return 'en';
  return 'en';
}
