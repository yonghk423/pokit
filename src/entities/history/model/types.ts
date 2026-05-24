export type HistoryAchievementKind = 'streak' | 'minutes' | 'completion';

export type HistoryDailyStat = {
  dateKey: string;
  /** @deprecated UI·집계에서 사용하지 않음. 하위 호환용 */
  focusMinutes: number;
  completedFlowCount: number;
  sessionCount: number;
  /** 0..1 — 정해진 루틴 대비 달성 비율 */
  completionRate: number;
  /** @deprecated categoryCompletions 사용 */
  categoryMinutes: Record<string, number>;
  /** 카테고리별 완료(달성) 횟수 */
  categoryCompletions: Record<string, number>;
};

/** 저장소·레거시 행 등 categoryCompletions가 없을 수 있는 입력 */
export type HistoryDailyStatInput = Omit<HistoryDailyStat, 'categoryCompletions'> & {
  categoryCompletions?: Record<string, number>;
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
  /** @deprecated 기록하지 않음 */
  minutes?: number;
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
  completions: number;
  ratio: number;
};

export type HistoryHeatMapCell = {
  dateKey: string;
  completedFlowCount: number;
  completionRate: number;
  level: 0 | 1 | 2 | 3;
};

export type HistoryWeekdayConsistencyRow = {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  averageCompletions: number;
  averageCompletionRate: number;
};

export type HistoryGrowthSummary = {
  currentWeekCompletions: number;
  previousWeekCompletions: number;
  diffCompletions: number;
  diffRatio: number;
};
