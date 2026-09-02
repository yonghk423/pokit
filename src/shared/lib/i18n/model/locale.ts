export const SUPPORTED_APP_LOCALES = ['ko', 'en', 'ja'] as const;

export type AppLocale = (typeof SUPPORTED_APP_LOCALES)[number];

export function detectDeviceLanguageTag(): string {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  if (typeof locale === 'string' && locale.trim().length > 0) {
    return locale;
  }
  return 'en';
}

/** 기기 언어 태그를 앱 지원 언어(ko/en/ja)로 축약한다. */
export function resolveAppLocaleFromLanguageTag(languageTag: string | null | undefined): AppLocale {
  const tag = typeof languageTag === 'string' ? languageTag.trim().toLowerCase() : '';
  if (tag.startsWith('ko')) return 'ko';
  if (tag.startsWith('ja')) return 'ja';
  if (tag.startsWith('en')) return 'en';
  return 'en';
}
