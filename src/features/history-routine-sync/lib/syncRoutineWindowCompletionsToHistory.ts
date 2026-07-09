import { getCategoryCompletions, useHistoryStore } from '@entities/history';
import { sumCategoryCompletions } from '@entities/history/lib/historyCompletionMetrics';
import { useDayPlanDraftStore } from '@entities/day-plan';
import { normalizeHistoryRecordKey } from '@shared/lib/routineHistoryLayoutKey';

import {
  collectRoutineWindowCompletions,
  getRoutineScopeCategoryKeys,
} from './collectRoutineWindowCompletions';

function clampRate(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** 히스토리 데일리 진입 시 루틴 시간대 완료 항목을 추세(일별 기록)에 반영합니다. */
export function syncRoutineWindowCompletionsToHistory(dateKey: string): void {
  const trimmed = dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return;

  const { categoryKeys, plannedCountForDay } = collectRoutineWindowCompletions(trimmed);
  const activeKeys = new Set(categoryKeys);
  const routineScopeKeys = getRoutineScopeCategoryKeys(trimmed);

  const history = useHistoryStore.getState();
  if (!history.isHydrated) {
    history.hydrate();
  }

  const draft = useDayPlanDraftStore.getState();
  const existingRow = history.dailyStatsByDate[trimmed];
  const existingCompletions: Record<string, number> = {};
  for (const [key, count] of Object.entries(
    getCategoryCompletions(existingRow ?? { categoryMinutes: {} }),
  )) {
    if (count <= 0) continue;
    const categoryKey = normalizeHistoryRecordKey(key);
    if (!categoryKey) continue;
    existingCompletions[categoryKey] = (existingCompletions[categoryKey] ?? 0) + count;
  }

  let changed = false;

  for (const categoryKey of categoryKeys) {
    if ((existingCompletions[categoryKey] ?? 0) >= 1) continue;
    existingCompletions[categoryKey] = 1;
    changed = true;
  }

  for (const categoryKey of routineScopeKeys) {
    if (activeKeys.has(categoryKey)) continue;
    if ((existingCompletions[categoryKey] ?? 0) < 1) continue;
    delete existingCompletions[categoryKey];
    changed = true;
  }

  const pendingCount = draft.routineHistoryPendingByDate[trimmed]?.length ?? 0;
  if (!changed) {
    if (pendingCount > 0) {
      useDayPlanDraftStore.getState().clearRoutineHistoryPendingForDate(trimmed);
    }
    return;
  }

  const completedFlowCount = sumCategoryCompletions(existingCompletions);
  if (!existingRow && completedFlowCount === 0) {
    if (pendingCount > 0) {
      useDayPlanDraftStore.getState().clearRoutineHistoryPendingForDate(trimmed);
    }
    return;
  }

  history.upsertDailyStat({
    dateKey: trimmed,
    focusMinutes: existingRow?.focusMinutes ?? 0,
    completedFlowCount,
    sessionCount: Math.max(existingRow?.sessionCount ?? 0, completedFlowCount),
    completionRate:
      plannedCountForDay > 0
        ? clampRate(completedFlowCount / plannedCountForDay)
        : clampRate(existingRow?.completionRate ?? 0),
    categoryMinutes: {},
    categoryCompletions: existingCompletions,
  });

  if (pendingCount > 0 || categoryKeys.length > 0) {
    useDayPlanDraftStore.getState().clearRoutineHistoryPendingForDate(trimmed);
  }
}
