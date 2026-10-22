import { t, type I18nKey } from '@shared/lib/i18n';

/** 담기·루틴 탭 카탈로그에 보이는 표준 카테고리 표시명 — 단일 기준 */
export const PRIORITY_CATALOG_PICKER_LABELS: Record<string, string> = {
  healthIntake: '영양 챙기기',
  water: '수분 섭취',
  fasting: '체중 관리',
  reading: '책읽기',
  work: '노트',
  other: '오늘의 주인공 직접 설정',
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
  other: ['루틴 직접 설정'],
  reading: ['독서', 'Reading', '読書'],
  healthIntake: ['건강을 위한 섭취', '약 복용', 'Health intake', 'Medicine', '健康のための摂取', 'おくすり'],
  fasting: ['체중관리', '체중조절', '체중 조절', '단식', 'Weight control'],
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
