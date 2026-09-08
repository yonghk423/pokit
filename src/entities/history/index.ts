export {
  getCategoryCompletions,
  lookupCategoryCompletionCount,
  sumCategoryCompletions,
  sumCategoryCompletionsInRange,
} from './lib/historyCompletionMetrics';
export {
  addDaysToHistoryDateKey,
  historyDateKeyToday,
  historyDateToKey,
} from './lib/historyDateKey';
export {
  buildRoutineHistoryRecordKey,
  normalizeHistoryRecordKey,
  parseRoutineHistoryRecordKey,
  resolveDraftLayoutMode,
  ROUTINE_HISTORY_LAYOUT_MODES,
  type RoutineHistoryLayoutMode,
} from '@shared/lib/routineHistoryLayoutKey';
export { useHistoryStore } from './model';
export type {
  HistoryDailyStat,
  HistoryDailyStatInput,
  HistorySessionRecordInput,
  HistoryStoreState,
} from './model';
