export { dayHasCompletionActivity, getCategoryCompletions } from './lib/historyCompletionMetrics';
export { buildWeeklyHeatMapCells } from './lib/buildWeeklyHeatMap';
export { buildCategoryBreakdown } from './lib/buildCategoryBreakdown';
export { buildConsistencyByWeekday } from './lib/buildConsistencyByWeekday';
export { useHistoryStore } from './model';
export type {
  HistoryAchievement,
  HistoryAchievementKind,
  HistoryCategoryBreakdownRow,
  HistoryDailyStat,
  HistoryGrowthSummary,
  HistoryHeatMapCell,
  HistoryRange,
  HistorySessionRecordInput, HistoryStoreState, HistoryWeekdayConsistencyRow
} from './model';

