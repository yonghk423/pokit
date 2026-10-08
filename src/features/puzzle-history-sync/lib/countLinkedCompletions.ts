import { getCategoryCompletions, type HistoryDailyStat } from '@entities/history';
import { normalizeLinkedCategoryKeys } from '@entities/puzzle-history';
import { normalizeHistoryRecordKey } from '@shared/lib/routineHistoryLayoutKey';

function normalizedLinkedKeys(linkedCategoryKeys: string[] | undefined): string[] {
  return normalizeLinkedCategoryKeys(linkedCategoryKeys)
    .map((key) => normalizeHistoryRecordKey(key))
    .filter(Boolean);
}

/**
 * 연결 루틴들의 완료 횟수 합.
 * - linked 있음: 각 루틴 categoryCompletions 합(여러 루틴 → 한 사진에 누적)
 * - linked 없음(레거시): completedFlowCount 합
 */
export function countLinkedCompletions(
  linkedCategoryKeys: string[] | undefined,
  dailyStatsByDate: Record<string, HistoryDailyStat | undefined>,
): number {
  const linked = normalizedLinkedKeys(linkedCategoryKeys);

  let sum = 0;
  for (const row of Object.values(dailyStatsByDate)) {
    if (!row) continue;
    if (linked.length === 0) {
      sum += Math.max(0, Math.floor(row.completedFlowCount ?? 0));
      continue;
    }
    const completions = getCategoryCompletions(row);
    for (const key of linked) {
      sum += Math.max(0, Math.floor(completions[key] ?? 0));
    }
  }
  return sum;
}

/** 연결 루틴별 누적 완료 횟수 (히스토리 전체 기간). */
export function countCompletionsByCategory(
  linkedCategoryKeys: string[] | undefined,
  dailyStatsByDate: Record<string, HistoryDailyStat | undefined>,
): Record<string, number> {
  const linked = normalizedLinkedKeys(linkedCategoryKeys);
  const out: Record<string, number> = {};
  for (const key of linked) out[key] = 0;

  for (const row of Object.values(dailyStatsByDate)) {
    if (!row) continue;
    const completions = getCategoryCompletions(row);
    for (const key of linked) {
      out[key] = (out[key] ?? 0) + Math.max(0, Math.floor(completions[key] ?? 0));
    }
  }
  return out;
}

/**
 * 퍼즐 시작 이후 루틴별 기여 횟수 = 현재 누적 − 시작 baseline.
 * baseline 키가 없으면 0으로 본다(레거시).
 */
export function linkedRoutineContributionCounts(params: {
  linkedCategoryKeys: string[] | undefined;
  completionBaselineByCategory?: Record<string, number>;
  dailyStatsByDate: Record<string, HistoryDailyStat | undefined>;
}): Array<{ categoryKey: string; count: number }> {
  const originalKeys = normalizeLinkedCategoryKeys(params.linkedCategoryKeys);
  if (originalKeys.length === 0) return [];

  const current = countCompletionsByCategory(originalKeys, params.dailyStatsByDate);
  const baseline = params.completionBaselineByCategory ?? {};

  return originalKeys.map((originalKey) => {
    const norm = normalizeHistoryRecordKey(originalKey) || originalKey;
    const cur = current[norm] ?? current[originalKey] ?? 0;
    const base = Math.max(
      0,
      Math.floor(Number(baseline[norm] ?? baseline[originalKey]) || 0),
    );
    return {
      categoryKey: originalKey,
      count: Math.max(0, cur - base),
    };
  });
}

export function desiredPuzzleCompletions(params: {
  linkedCategoryKeys: string[] | undefined;
  completionBaseline: number;
  dailyStatsByDate: Record<string, HistoryDailyStat | undefined>;
}): number {
  const total = countLinkedCompletions(params.linkedCategoryKeys, params.dailyStatsByDate);
  return Math.max(0, total - Math.max(0, Math.floor(params.completionBaseline)));
}
