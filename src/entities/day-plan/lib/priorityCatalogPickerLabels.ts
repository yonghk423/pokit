import { t } from '@shared/lib/i18n';

/** 담기·루틴 탭 카탈로그에 보이는 표준 카테고리 표시명 — 단일 기준 */
export const PRIORITY_CATALOG_PICKER_LABELS: Record<string, string> = {
  healthIntake: '건강을 위한 섭취',
  water: '수분 섭취',
  fasting: '체중조절',
  reading: '독서',
  work: '노트',
  other: '루틴 직접 설정',
};

export function getPriorityCatalogPickerLabel(key: string): string {
  if (key === 'healthIntake') return t('category.healthIntake');
  if (key === 'water') return t('category.water');
  if (key === 'fasting') return t('category.fasting');
  if (key === 'reading') return t('category.reading');
  if (key === 'work') return t('category.work');
  if (key === 'other') return t('category.other');
  if (key === 'review') return t('category.review');
  return key;
}
