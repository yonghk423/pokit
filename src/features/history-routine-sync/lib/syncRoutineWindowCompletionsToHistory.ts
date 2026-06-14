import { getCategoryCompletions, useHistoryStore } from '@entities/history';
import { useDayPlanDraftStore } from '@entities/day-plan';

import { collectRoutineWindowCompletions } from './collectRoutineWindowCompletions';

/** 히스토리 데일리 진입 시 루틴 시간대 완료 항목을 추세(일별 기록)에 반영합니다. */
export function syncRoutineWindowCompletionsToHistory(dateKey: string): void {
  const trimmed = dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return;

  const { categoryKeys, plannedCountForDay } = collectRoutineWindowCompletions(trimmed);
  if (categoryKeys.length === 0) return;

  const history = useHistoryStore.getState();
  if (!history.isHydrated) {
    history.hydrate();
  }

  const draft = useDayPlanDraftStore.getState();
  const existingRow = history.dailyStatsByDate[trimmed];
  const existingCompletions = getCategoryCompletions(
    existingRow ?? { categoryMinutes: {}, categoryCompletions: {} },
  );

  let recorded = false;
  for (const categoryKey of categoryKeys) {
    if ((existingCompletions[categoryKey] ?? 0) >= 1) continue;
    history.recordFocusSession({
      dateKey: trimmed,
      categoryKey,
      completed: true,
      plannedCountForDay,
    });
    existingCompletions[categoryKey] = (existingCompletions[categoryKey] ?? 0) + 1;
    recorded = true;
  }

  if (recorded || (draft.routineHistoryPendingByDate[trimmed]?.length ?? 0) > 0) {
    useDayPlanDraftStore.getState().clearRoutineHistoryPendingForDate(trimmed);
  }
}
