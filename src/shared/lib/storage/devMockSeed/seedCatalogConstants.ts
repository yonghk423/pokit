import { getBuiltinFlowDefaultLabel } from '@shared/lib/i18n/lib/builtinFlowLabels';
import type { AppLocale } from '@shared/lib/i18n/model/locale';

import { DEFAULT_BUILTIN_CUSTOM_FLOWS } from '../defaultPriorityCatalog';

/** 히스토리 seed에 쓰는 표준 카탈로그 키 */
export const SEED_STANDARD_CATEGORIES = [
  'healthIntake',
  'fasting',
  'reading',
  'work',
] as const;

export const SEED_CATEGORY_POOL = [
  ...SEED_STANDARD_CATEGORIES,
  ...DEFAULT_BUILTIN_CUSTOM_FLOWS.map((f) => f.id),
] as const;

const SEED_STANDARD_LABELS_KO: Record<string, string> = {
  healthIntake: '건강을 위한 섭취',
  water: '수분섭취',
  medicine: '약 복용',
  fasting: '체중조절',
  reading: '독서',
  work: '노트',
};

const SEED_STANDARD_LABELS_EN: Record<string, string> = {
  healthIntake: 'Health intake',
  water: 'Hydration',
  medicine: 'Medicine',
  fasting: 'Weight control',
  reading: 'Reading',
  work: 'Notes',
};

const SEED_STANDARD_LABELS_JA: Record<string, string> = {
  healthIntake: '健康のための摂取',
  water: '水分補給',
  medicine: '服薬',
  fasting: '体重管理',
  reading: '読書',
  work: 'ノート',
};

export const SEED_CATEGORY_LABEL_KO: Record<string, string> = {
  ...SEED_STANDARD_LABELS_KO,
  ...Object.fromEntries(DEFAULT_BUILTIN_CUSTOM_FLOWS.map((f) => [f.id, f.displayName])),
};

export function getSeedCategoryLabel(key: string, locale: AppLocale): string {
  const standard =
    locale === 'en'
      ? SEED_STANDARD_LABELS_EN[key]
      : locale === 'ja'
        ? SEED_STANDARD_LABELS_JA[key]
        : SEED_STANDARD_LABELS_KO[key];
  if (standard) return standard;
  const builtin = getBuiltinFlowDefaultLabel(key, locale);
  if (builtin) return builtin;
  return SEED_CATEGORY_LABEL_KO[key] ?? key;
}
