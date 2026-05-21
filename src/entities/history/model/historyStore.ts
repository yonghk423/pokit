import { create } from 'zustand';

import {
  clearHistoryStorage,
  loadHistoryAchievements,
  loadHistoryDailyStats,
  loadHistoryMeta,
  saveHistoryAchievements,
  saveHistoryDailyStats,
  saveHistoryMeta,
} from '@shared/lib/storage';

import type {
  HistoryAchievement,
  HistoryCategoryBreakdownRow,
  HistoryDailyStat,
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
  };
}

function normalizeDaily(row: HistoryDailyStat): HistoryDailyStat {
  const categoryMinutes: Record<string, number> = {};
  for (const [key, value] of Object.entries(row.categoryMinutes ?? {})) {
    const k = key.trim();
    if (!k) continue;
    const n = clampInt(value, 0);
    if (n <= 0) continue;
    categoryMinutes[k] = n;
  }
  return {
    dateKey: row.dateKey.trim(),
    focusMinutes: clampInt(row.focusMinutes, 0),
    completedFlowCount: clampInt(row.completedFlowCount, 0),
    sessionCount: clampInt(row.sessionCount, 0),
    completionRate: clampRate(row.completionRate),
    categoryMinutes,
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

function buildDailyMap(rows: HistoryDailyStat[]): Record<string, HistoryDailyStat> {
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
    if (!row || row.focusMinutes <= 0) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function heatLevel(minutes: number): 0 | 1 | 2 | 3 {
  if (minutes <= 0) return 0;
  if (minutes < 20) return 1;
  if (minutes < 60) return 2;
  return 3;
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
  clearHistory: () => void;

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
    const next: HistoryDailyStat = {
      ...prev,
      focusMinutes: prev.focusMinutes + clampInt(input.minutes, 0),
      sessionCount: prev.sessionCount + 1,
      completedFlowCount: prev.completedFlowCount + (input.completed ? 1 : 0),
      categoryMinutes: {
        ...prev.categoryMinutes,
        [input.categoryKey]: clampInt(prev.categoryMinutes[input.categoryKey] || 0, 0) + clampInt(input.minutes, 0),
      },
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
    const totalMinutes = Object.values(get().dailyStatsByDate).reduce((sum, row) => sum + row.focusMinutes, 0);

    if (streak >= 7) {
      achievements = ensureAchievement(achievements, {
        id: 'streak-7',
        kind: 'streak',
        unlockedAt: new Date().toISOString(),
        title: '7일 연속 집중',
        description: '일주일 연속으로 플로우를 이어갔어요.',
      });
    }
    if (streak >= 30) {
      achievements = ensureAchievement(achievements, {
        id: 'streak-30',
        kind: 'streak',
        unlockedAt: new Date().toISOString(),
        title: '30일 연속 집중',
        description: '한 달 연속으로 흐름을 지켰어요.',
      });
    }
    if (totalMinutes >= 50 * 60) {
      achievements = ensureAchievement(achievements, {
        id: 'minutes-3000',
        kind: 'minutes',
        unlockedAt: new Date().toISOString(),
        title: '누적 50시간',
        description: '누적 집중 시간이 50시간을 넘었어요.',
      });
    }

    set({ achievements });
    saveHistoryAchievements(achievements);
  },

  clearHistory: () => {
    set({
      dailyStatsByDate: {},
      achievements: [],
      lastUpdatedAt: new Date().toISOString(),
    });
    clearHistoryStorage();
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
      const minutes = row?.focusMinutes ?? 0;
      out.push({
        dateKey,
        minutes,
        completedFlowCount: row?.completedFlowCount ?? 0,
        level: heatLevel(minutes),
      });
    }
    return out;
  },

  selectCategoryBreakdown: (range) => {
    const minutesByCategory: Record<string, number> = {};
    let total = 0;
    for (const row of Object.values(get().dailyStatsByDate)) {
      if (!isBetween(row.dateKey, range)) continue;
      for (const [key, minutes] of Object.entries(row.categoryMinutes)) {
        const n = clampInt(minutes, 0);
        if (n <= 0) continue;
        minutesByCategory[key] = (minutesByCategory[key] || 0) + n;
        total += n;
      }
    }
    if (total <= 0) return [];
    return Object.entries(minutesByCategory)
      .map(([categoryKey, minutes]) => ({
        categoryKey,
        minutes,
        ratio: minutes / total,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  },

  selectConsistencyByWeekday: (range) => {
    const bucket: Record<number, { days: number; minutes: number; completionRateTotal: number }> = {};
    for (let i = 0; i < 7; i += 1) {
      bucket[i] = { days: 0, minutes: 0, completionRateTotal: 0 };
    }
    for (const row of Object.values(get().dailyStatsByDate)) {
      if (!isBetween(row.dateKey, range)) continue;
      const weekday = toWeekday(row.dateKey);
      bucket[weekday].days += 1;
      bucket[weekday].minutes += row.focusMinutes;
      bucket[weekday].completionRateTotal += row.completionRate;
    }
    const out: HistoryWeekdayConsistencyRow[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const item = bucket[weekday];
      const days = Math.max(item.days, 1);
      out.push({
        weekday: weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        averageMinutes: Math.round(item.minutes / days),
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

    let currentWeekMinutes = 0;
    let previousWeekMinutes = 0;
    for (const row of Object.values(get().dailyStatsByDate)) {
      if (row.dateKey >= currentWeekStart && row.dateKey <= currentWeekEnd) {
        currentWeekMinutes += row.focusMinutes;
      } else if (row.dateKey >= prevWeekStart && row.dateKey <= prevWeekEnd) {
        previousWeekMinutes += row.focusMinutes;
      }
    }

    const diffMinutes = currentWeekMinutes - previousWeekMinutes;
    const diffRatio = previousWeekMinutes > 0 ? diffMinutes / previousWeekMinutes : currentWeekMinutes > 0 ? 1 : 0;
    return {
      currentWeekMinutes,
      previousWeekMinutes,
      diffMinutes,
      diffRatio,
    };
  },
}));

