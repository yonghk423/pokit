import { t, type I18nKey } from '@shared/lib/i18n';

/** 담기·루틴 탭 카탈로그에 보이는 표준 카테고리 표시명 — 단일 기준 */
export const PRIORITY_CATALOG_PICKER_LABELS: Record<string, string> = {
  healthIntake: '건강을 위한 섭취',
  water: '수분 섭취',
  fasting: '체중조절',
  reading: '독서',
  work: '노트',
  other: '루틴 직접 설정',
};

const STANDARD_LABEL_KEYS: Record<string, I18nKey> = {
  healthIntake: 'category.healthIntake',
  water: 'category.water',
  fasting: 'category.fasting',
  reading: 'category.reading',
  work: 'category.work',
  other: 'category.other',
  review: 'category.review',
};

/** 예전에 쓰던 기본명 — 로케일 사전에 없어도 기본값으로 본다 */
const STANDARD_LABEL_ALIASES: Record<string, readonly string[]> = {
  fasting: ['체중관리', '단식', 'Weight control'],
};

export function getPriorityCatalogPickerLabel(key: string): string {
  const i18nKey = STANDARD_LABEL_KEYS[key];
  if (i18nKey) return t(i18nKey);
  return key;
}

export function isStandardCatalogDefaultDisplayName(key: string, displayName: string): boolean {
  const trimmed = displayName.trim();
  if (!trimmed) return false;
  const i18nKey = STANDARD_LABEL_KEYS[key];
  if (i18nKey) {
    const matchesLocale = (['ko', 'en', 'ja'] as const).some(
      (locale) => t(i18nKey, locale) === trimmed,
    );
    if (matchesLocale) return true;
  }
  if (PRIORITY_CATALOG_PICKER_LABELS[key] === trimmed) return true;
  return (STANDARD_LABEL_ALIASES[key] ?? []).includes(trimmed);
}

/** 내장 표준 카테고리: 저장명이 기본값이면 현재 로케일, 사용자가 지은 이름은 유지 */
export function resolveStandardCatalogDisplayLabel(key: string, stored: string): string {
  const localized = getPriorityCatalogPickerLabel(key);
  const trimmed = stored.trim();
  if (!trimmed) return localized;
  if (isStandardCatalogDefaultDisplayName(key, trimmed)) return localized;
  return trimmed;
}
