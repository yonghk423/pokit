import type { AppLocale } from './locale';
import { i18n } from './i18nInstance';
import { getAppLocale } from './localeStore';
import koMessages from './messages/ko.json';

export type I18nKey = keyof typeof koMessages;

export type TParams = Record<string, string | number>;

function isAppLocale(value: unknown): value is AppLocale {
  return value === 'ko' || value === 'en' || value === 'ja';
}

/**
 * i18next 기반 번역.
 * `count` 등은 복수형 옵션과 충돌하지 않도록 `replace`로만 넘긴다.
 */
export function t(
  key: I18nKey,
  localeOrParams?: AppLocale | TParams,
  params?: TParams,
): string {
  let locale = getAppLocale();
  let replacements: TParams | undefined;

  if (isAppLocale(localeOrParams)) {
    locale = localeOrParams;
    replacements = params;
  } else if (localeOrParams) {
    replacements = localeOrParams;
  }

  const translated = i18n.t(key, {
    lng: locale,
    defaultValue: key,
    ...(replacements ? { replace: replacements } : {}),
  });

  return typeof translated === 'string' ? translated : String(translated);
}

/** 알림 본문 등 — 모드별 `{symbol} {count}{suffix}` 조각 */
export function tIncompleteRoutineCountPart(count: number, locale?: AppLocale): string {
  const resolvedLocale = locale ?? getAppLocale();
  const suffix = t('notify.incomplete.countSuffix', resolvedLocale);
  if (resolvedLocale === 'en') {
    return suffix ? `${count}${suffix}` : String(count);
  }
  return `${count}${suffix}`;
}
