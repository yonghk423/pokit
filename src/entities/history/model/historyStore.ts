import { create } from 'zustand';

import {
  loadHistoryAchievements,
  loadHistoryDailyStats,
  loadHistoryMeta,
  saveHistoryAchievements,
  saveHistoryDailyStats,
  saveHistoryMeta,
} from '@shared/lib/storage';

import { buildConsistencyByWeekday } from '../lib/buildConsistencyByWeekday';
import { buildCategoryBreakdown } from '../lib/buildCategoryBreakdown';
import { buildWeeklyHeatMapCells } from '../lib/buildWeeklyHeatMap';
import {
  dayHasCompletionActivity,
  getCategoryCompletions,
  sumCategoryCompletions,
} from '../lib/historyCompletionMetrics';
import {
  addDaysToHistoryDateKey,
  historyDateKeyToday,
} from '../lib/historyDateKey';

import type {
  HistoryAchievement,
  HistoryCategoryBreakdownRow,
  HistoryDailyStat,
  HistoryDailyStatInput,
  HistoryGrowthSummary,
  HistoryHeatMapCell,
  HistoryRange,
  HistorySessionRecordInput,
  HistoryWeekdayConsistencyRow,
} from './types';

function clampInt(value: number, min = 0): number {
  const n = Math.floor(Number(value) || 0);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, n);
}

function clampRate(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function emptyDaily(dateKey: string): HistoryDailyStat {
  return {
    dateKey,
    focusMinutes: 0,
    completedFlowCount: 0,
    sessionCount: 0,
    completionRate: 0,
    categoryMinutes: {},
    categoryCompletions: {},
  };
}

function normalizeDaily(row: HistoryDailyStatInput): HistoryDailyStat {
  const categoryCompletions = getCategoryCompletions(row);
  const completedFlowCountRaw = clampInt(row.completedFlowCount, 0);
  const completedFlowCountFromCategories = sumCategoryCompletions(categoryCompletions);
  const completedFlowCount = Math.max(completedFlowCountRaw, completedFlowCountFromCategories);
  const sessionCount = Math.max(clampInt(row.sessionCount, 0), completedFlowCount);
  return {
    dateKey: row.dateKey.trim(),
    focusMinutes: 0,
    completedFlowCount,
    sessionCount,
    completionRate: clampRate(row.completionRate),
    categoryMinutes: {},
    categoryCompletions,
  };
}

function effectiveCompletedFlowCount(row: HistoryDailyStat | undefined): number {
  if (!row) return 0;
  const fromField = clampInt(row.completedFlowCount, 0);
  const fromCategories = sumCategoryCompletions(getCategoryCompletions(row));
  return Math.max(fromField, fromCategories);
}

function normalizeAchievement(row: HistoryAchievement): HistoryAchievement | null {
  const id = row.id.trim();
  const title = row.title.trim();
  if (!id || !title) return null;
  return {
    id,
    kind: row.kind,
    unlockedAt: row.unlockedAt,
    title,
    description: row.description?.trim() || undefined,
  };
}

function buildDailyMap(rows: HistoryDailyStatInput[]): Record<string, HistoryDailyStat> {
  const out: Record<string, HistoryDailyStat> = {};
  for (const row of rows) {
    const normalized = normalizeDaily(row);
    if (!normalized.dateKey) continue;
    out[normalized.dateKey] = normalized;
  }
  return out;
}

function listDaily(map: Record<string, HistoryDailyStat>): HistoryDailyStat[] {
  return Object.values(map).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function computeCurrentStreak(
  map: Record<string, HistoryDailyStat>,
  anchorDateKey: string,
): number {
  let streak = 0;
  let cursor = anchorDateKey;
  while (true) {
    const row = map[cursor];
    if (!dayHasCompletionActivity(row)) break;
    streak += 1;
    cursor = addDaysToHistoryDateKey(cursor, -1);
  }
  return streak;
}

function ensureAchievement(rows: HistoryAchievement[], next: HistoryAchievement): HistoryAchievement[] {
  if (rows.some((r) => r.id === next.id)) return rows;
  return [...rows, next];
}

export type HistoryStoreState = {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  achievements: HistoryAchievement[];
  lastUpdatedAt: string;
  isHydrated: boolean;

  hydrate: () => void;
  reloadFromStorage: () => void;
  recordFocusSession: (input: HistorySessionRecordInput) => void;
  upsertDailyStat: (row: HistoryDailyStat) => void;
  recordAchievement: (row: HistoryAchievement) => void;
  recomputeAchievements: () => void;

  selectCurrentStreak: (anchorDateKey?: string) => number;
  selectWeeklyHeatMap: (weeks?: number, anchorDateKey?: string) => HistoryHeatMapCell[];
  selectCategoryBreakdown: (range: HistoryRange) => HistoryCategoryBreakdownRow[];
  selectConsistencyByWeekday: (range: HistoryRange) => HistoryWeekdayConsistencyRow[];
  selectGrowthVsPreviousWeek: (anchorDateKey?: string) => HistoryGrowthSummary;
};

export const useHistoryStore = create<HistoryStoreState>((set, get) => ({
  dailyStatsByDate: {},
  achievements: [],
  lastUpdatedAt: '',
  isHydrated: false,

  reloadFromStorage: () => {
    const daily = loadHistoryDailyStats();
    const achievements = loadHistoryAchievements();
    const meta = loadHistoryMeta();
    set({
      dailyStatsByDate: buildDailyMap(daily),
      achievements,
      lastUpdatedAt: meta?.lastUpdatedAt || '',
      isHydrated: true,
    });
  },

  hydrate: () => {
    get().reloadFromStorage();
  },

  recordFocusSession: (input) => {
    const dateKey = input.dateKey.trim();
    if (!dateKey) return;

    const prev = get().dailyStatsByDate[dateKey] ?? emptyDaily(dateKey);
    const categoryKey = input.categoryKey.trim();
    const completed = Boolean(input.completed);
    const categoryCompletions = { ...getCategoryCompletions(prev) };
    if (completed && categoryKey) {
      categoryCompletions[categoryKey] = clampInt(categoryCompletions[categoryKey] || 0, 0) + 1;
    }

    const next: HistoryDailyStat = {
      ...prev,
      focusMinutes: 0,
      sessionCount: prev.sessionCount + 1,
      completedFlowCount: prev.completedFlowCount + (completed ? 1 : 0),
      categoryMinutes: {},
      categoryCompletions,
    };

    if (typeof input.plannedCountForDay === 'number' && input.plannedCountForDay > 0) {
      next.completionRate = clampRate(next.completedFlowCount / input.plannedCountForDay);
    } else {
      next.completionRate = clampRate(next.completionRate);
    }

    const dailyStatsByDate = {
      ...get().dailyStatsByDate,
      [dateKey]: normalizeDaily(next),
    };
    const lastUpdatedAt = new Date().toISOString();

    set({ dailyStatsByDate, lastUpdatedAt });
    saveHistoryDailyStats(listDaily(dailyStatsByDate));
    saveHistoryMeta({ schemaVersion: 1, lastUpdatedAt });
  },

  upsertDailyStat: (row) => {
    const normalized = normalizeDaily(row);
    if (!normalized.dateKey) return;

    const dailyStatsByDate = {
      ...get().dailyStatsByDate,
      [normalized.dateKey]: normalized,
    };
    const lastUpdatedAt = new Date().toISOString();

    set({ dailyStatsByDate, lastUpdatedAt });
    saveHistoryDailyStats(listDaily(dailyStatsByDate));
    saveHistoryMeta({ schemaVersion: 1, lastUpdatedAt });
  },

  recordAchievement: (row) => {
    const normalized = normalizeAchievement(row);
    if (!normalized) return;
    const achievements = ensureAchievement(get().achievements, normalized);
    set({ achievements });
    saveHistoryAchievements(achievements);
  },

  recomputeAchievements: () => {
    let achievements = [...get().achievements];
    const streak = get().selectCurrentStreak();
    const totalCompletions = Object.values(get().dailyStatsByDate).reduce(
      (sum, row) => sum + effectiveCompletedFlowCount(row),
      0,
    );

    if (streak >= 7) {
      achievements = ensureAchievement(achievements, {
        id: 'streak-7',
        kind: 'streak',
        unlockedAt: new Date().toISOString(),
        title: '7일 연속 달성',
        description: '일주일 연속으로 루틴을 달성했어요.',
      });
    }
    if (streak >= 30) {
      achievements = ensureAchievement(achievements, {
        id: 'streak-30',
        kind: 'streak',
        unlockedAt: new Date().toISOString(),
        title: '30일 연속 달성',
        description: '한 달 연속으로 루틴을 지켰어요.',
      });
    }
    if (totalCompletions >= 50) {
      achievements = ensureAchievement(achievements, {
        id: 'completions-50',
        kind: 'completion',
        unlockedAt: new Date().toISOString(),
        title: '누적 50회 달성',
        description: '누적 완료가 50회를 넘었어요.',
      });
    }

    set({ achievements });
    saveHistoryAchievements(achievements);
  },

  selectCurrentStreak: (anchorDateKey) => {
    const anchor = anchorDateKey?.trim() || historyDateKeyToday();
    return computeCurrentStreak(get().dailyStatsByDate, anchor);
  },

  selectWeeklyHeatMap: (weeks = 4, anchorDateKey) => {
    const anchor = anchorDateKey?.trim() || historyDateKeyToday();
    return buildWeeklyHeatMapCells(get().dailyStatsByDate, weeks, anchor);
  },

  selectCategoryBreakdown: (range) => {
    return buildCategoryBreakdown(get().dailyStatsByDate, range);
  },

  selectConsistencyByWeekday: (range) => {
    return buildConsistencyByWeekday(get().dailyStatsByDate, range);
  },

  selectGrowthVsPreviousWeek: (anchorDateKey) => {
    const anchor = anchorDateKey?.trim() || historyDateKeyToday();
    const currentWeekStart = addDaysToHistoryDateKey(anchor, -6);
    const currentWeekEnd = anchor;
    const prevWeekStart = addDaysToHistoryDateKey(anchor, -13);
    const prevWeekEnd = addDaysToHistoryDateKey(anchor, -7);

    let currentWeekCompletions = 0;
    let previousWeekCompletions = 0;
    for (const row of Object.values(get().dailyStatsByDate)) {
      if (row.dateKey >= currentWeekStart && row.dateKey <= currentWeekEnd) {
        currentWeekCompletions += effectiveCompletedFlowCount(row);
      } else if (row.dateKey >= prevWeekStart && row.dateKey <= prevWeekEnd) {
        previousWeekCompletions += effectiveCompletedFlowCount(row);
      }
    }

    const diffCompletions = currentWeekCompletions - previousWeekCompletions;
    const diffRatio =
      previousWeekCompletions > 0
        ? diffCompletions / previousWeekCompletions
        : currentWeekCompletions > 0
          ? 1
          : 0;
    return {
      currentWeekCompletions,
      previousWeekCompletions,
      diffCompletions,
      diffRatio,
    };
  },
}));

