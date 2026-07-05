import { categoryReminderLabelKo } from '@entities/day-plan';

/** 완료 횟수가 최대인 카테고리 라벨(동률 전부, 가나다순) */
export function resolveTopCategoryLabels(totalsByCategory: Map<string, number>): string[] {
  if (totalsByCategory.size === 0) return [];

  const sorted = [...totalsByCategory.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'),
  );
  const maxCount = sorted[0]![1];
  if (maxCount <= 0) return [];

  return sorted
    .filter(([, count]) => count === maxCount)
    .map(([key]) => categoryReminderLabelKo(key))
    .sort((a, b) => a.localeCompare(b, 'ko'));
}
