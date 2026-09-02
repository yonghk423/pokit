import type { AppLocale } from './locale';
import { getAppLocale } from './localeStore';
import enMessages from './messages/en.json';
import jaMessages from './messages/ja.json';
import koMessages from './messages/ko.json';

const MESSAGES = {
  ko: koMessages,
  en: enMessages,
  ja: jaMessages,
} as const;

export type I18nKey = keyof typeof koMessages;

export type TParams = Record<string, string | number>;

function messagesFor(locale: AppLocale): Record<string, string> {
  return MESSAGES[locale] as Record<string, string>;
}

function applyParams(text: string, params?: TParams): string {
  if (!params) return text;
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    text,
  );
}

function isAppLocale(value: unknown): value is AppLocale {
  return value === 'ko' || value === 'en' || value === 'ja';
}

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

  const selected = messagesFor(locale);
  const raw = selected[key] ?? messagesFor('en')[key] ?? key;
  return applyParams(raw, replacements);
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
