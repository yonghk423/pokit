import { create } from 'zustand';

import {
  loadHistoryAchievements,
  loadHistoryDailyStats,
  loadHistoryMeta,
  saveHistoryAchievements,
  saveHistoryDailyStats,
  saveHistoryMeta,
} from '@shared/lib/storage';

import {
  dayHasCompletionActivity,
  getCategoryCompletions,
} from '../lib/historyCompletionMetrics';

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

function parseDateKey(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = new Date(y, mo, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function addDays(dateKey: string, delta: number): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  date.setDate(date.getDate() + delta);
  return dateToKey(date);
}

function toStartOfWeekMonday(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  const weekday = (date.getDay() + 6) % 7; // monday=0
  date.setDate(date.getDate() - weekday);
  return dateToKey(date);
}

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
  return {
    dateKey: row.dateKey.trim(),
    focusMinutes: 0,
    completedFlowCount: clampInt(row.completedFlowCount, 0),
    sessionCount: clampInt(row.sessionCount, 0),
    completionRate: clampRate(row.completionRate),
    categoryMinutes: {},
    categoryCompletions,
  };
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
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function heatLevel(completedCount: number, completionRate: number): 0 | 1 | 2 | 3 {
  if (completedCount <= 0 && completionRate <= 0) return 0;
  if (completionRate >= 0.85 || completedCount >= 5) return 3;
  if (completionRate >= 0.55 || completedCount >= 3) return 2;
  return 1;
}

function toWeekday(dateKey: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const date = parseDateKey(dateKey);
  if (!date) return 0;
  return date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

function isBetween(dateKey: string, range: HistoryRange): boolean {
  return dateKey >= range.startDateKey && dateKey <= range.endDateKey;
}

function toNowDateKey(): string {
  return dateToKey(new Date());
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

  hydrate: () => {
    if (get().isHydrated) return;
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
      (sum, row) => sum + row.completedFlowCount,
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
    const anchor = anchorDateKey?.trim() || toNowDateKey();
    return computeCurrentStreak(get().dailyStatsByDate, anchor);
  },

  selectWeeklyHeatMap: (weeks = 4, anchorDateKey) => {
    const anchor = anchorDateKey?.trim() || toNowDateKey();
    const weekStart = toStartOfWeekMonday(anchor);
    const totalDays = Math.max(1, clampInt(weeks, 1) * 7);
    const firstDay = addDays(weekStart, -(totalDays - 1));
    const out: HistoryHeatMapCell[] = [];
    for (let i = 0; i < totalDays; i += 1) {
      const dateKey = addDays(firstDay, i);
      const row = get().dailyStatsByDate[dateKey];
      const completedFlowCount = row?.completedFlowCount ?? 0;
      const completionRate = row?.completionRate ?? 0;
      out.push({
        dateKey,
        completedFlowCount,
        completionRate,
        level: heatLevel(completedFlowCount, completionRate),
      });
    }
    return out;
  },

  selectCategoryBreakdown: (range) => {
    const completionsByCategory: Record<string, number> = {};
    let total = 0;
    for (const row of Object.values(get().dailyStatsByDate)) {
      if (!isBetween(row.dateKey, range)) continue;
      for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
        const n = clampInt(count, 0);
        if (n <= 0) continue;
        completionsByCategory[key] = (completionsByCategory[key] || 0) + n;
        total += n;
      }
    }
    if (total <= 0) return [];
    return Object.entries(completionsByCategory)
      .map(([categoryKey, completions]) => ({
        categoryKey,
        completions,
        ratio: completions / total,
      }))
      .sort((a, b) => b.completions - a.completions);
  },

  selectConsistencyByWeekday: (range) => {
    const bucket: Record<number, { days: number; completions: number; completionRateTotal: number }> =
      {};
    for (let i = 0; i < 7; i += 1) {
      bucket[i] = { days: 0, completions: 0, completionRateTotal: 0 };
    }
    for (const row of Object.values(get().dailyStatsByDate)) {
      if (!isBetween(row.dateKey, range)) continue;
      const weekday = toWeekday(row.dateKey);
      bucket[weekday].days += 1;
      bucket[weekday].completions += row.completedFlowCount;
      bucket[weekday].completionRateTotal += row.completionRate;
    }
    const out: HistoryWeekdayConsistencyRow[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const item = bucket[weekday];
      const days = Math.max(item.days, 1);
      out.push({
        weekday: weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        averageCompletions: Math.round(item.completions / days),
        averageCompletionRate: clampRate(item.completionRateTotal / days),
      });
    }
    return out;
  },

  selectGrowthVsPreviousWeek: (anchorDateKey) => {
    const anchor = anchorDateKey?.trim() || toNowDateKey();
    const currentWeekStart = toStartOfWeekMonday(anchor);
    const prevWeekStart = addDays(currentWeekStart, -7);
    const currentWeekEnd = addDays(currentWeekStart, 6);
    const prevWeekEnd = addDays(prevWeekStart, 6);

    let currentWeekCompletions = 0;
    let previousWeekCompletions = 0;
    for (const row of Object.values(get().dailyStatsByDate)) {
      if (row.dateKey >= currentWeekStart && row.dateKey <= currentWeekEnd) {
        currentWeekCompletions += row.completedFlowCount;
      } else if (row.dateKey >= prevWeekStart && row.dateKey <= prevWeekEnd) {
        previousWeekCompletions += row.completedFlowCount;
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

