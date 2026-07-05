/** 담기·루틴 탭 카탈로그에 보이는 표준 카테고리 표시명 — 단일 기준 */
export const PRIORITY_CATALOG_PICKER_LABELS: Record<string, string> = {
  healthIntake: '건강을 위한 섭취',
  fasting: '체중관리',
  reading: '독서',
  work: '스터디',
  other: '루틴 직접 설정',
};

export function getPriorityCatalogPickerLabel(key: string): string {
  return PRIORITY_CATALOG_PICKER_LABELS[key] ?? key;
}
