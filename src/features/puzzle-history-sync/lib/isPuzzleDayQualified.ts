import { getCategoryCompletions, type HistoryDailyStat } from '@entities/history';
import { normalizeLinkedCategoryKeys } from '@entities/puzzle-history';
import { normalizeHistoryRecordKey } from '@shared/lib/routineHistoryLayoutKey';

/**
 * @deprecated 완료 횟수 모델에서는 countLinkedCompletions 사용.
 * 레거시 테스트 호환용으로 유지.
 */
export function isPuzzleDayQualified(
  linkedCategoryKeys: string[] | undefined,
  row: HistoryDailyStat | undefined,
): boolean {
  if (!row) return false;
  const linked = normalizeLinkedCategoryKeys(linkedCategoryKeys).map((key) =>
    normalizeHistoryRecordKey(key),
  );
  const linkedKeys = linked.filter(Boolean);
  if (linkedKeys.length === 0) {
    return (row.completedFlowCount ?? 0) > 0;
  }
  const completions = getCategoryCompletions(row);
  return linkedKeys.some((key) => (completions[key] ?? 0) > 0);
}
