export type HistoryAchievementKind = 'streak' | 'minutes' | 'completion';

export type HistoryDailyStat = {
  dateKey: string;
  focusMinutes: number;
  completedFlowCount: number;
  sessionCount: number;
  /** 0..1 */
  completionRate: number;
  categoryMinutes: Record<string, number>;
};

export type HistoryAchievement = {
  id: string;
  kind: HistoryAchievementKind;
  unlockedAt: string;
  title: string;
  description?: string;
};

export type HistorySessionRecordInput = {
  dateKey: string;
  minutes: number;
  categoryKey: string;
  completed?: boolean;
  plannedCountForDay?: number;
};

export type HistoryRange = {
  startDateKey: string;
  endDateKey: string;
};

export type HistoryCategoryBreakdownRow = {
  categoryKey: string;
  minutes: number;
  ratio: number;
};

export type HistoryHeatMapCell = {
  dateKey: string;
  minutes: number;
  completedFlowCount: number;
  level: 0 | 1 | 2 | 3;
};

export type HistoryWeekdayConsistencyRow = {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  averageMinutes: number;
  averageCompletionRate: number;
};

export type HistoryGrowthSummary = {
  currentWeekMinutes: number;
  previousWeekMinutes: number;
  diffMinutes: number;
  diffRatio: number;
};

