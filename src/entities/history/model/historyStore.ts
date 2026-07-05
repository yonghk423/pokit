import { create } from 'zustand';

import {
  loadHistoryDailyStats,
  loadHistoryMeta,
  saveHistoryDailyStats,
  saveHistoryMeta,
} from '@shared/lib/storage';

import {
  getCategoryCompletions,
  sumCategoryCompletions,
} from '../lib/historyCompletionMetrics';

import type { HistoryDailyStat, HistoryDailyStatInput, HistorySessionRecordInput } from './types';

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

export type HistoryStoreState = {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  lastUpdatedAt: string;
  isHydrated: boolean;

  hydrate: () => void;
  reloadFromStorage: () => void;
  recordFocusSession: (input: HistorySessionRecordInput) => void;
  upsertDailyStat: (row: HistoryDailyStat) => void;
};

export const useHistoryStore = create<HistoryStoreState>((set, get) => ({
  dailyStatsByDate: {},
  lastUpdatedAt: '',
  isHydrated: false,

  reloadFromStorage: () => {
    const daily = loadHistoryDailyStats();
    const meta = loadHistoryMeta();
    set({
      dailyStatsByDate: buildDailyMap(daily),
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
}));
