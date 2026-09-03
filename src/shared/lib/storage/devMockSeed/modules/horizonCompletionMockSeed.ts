import { getAppLocale } from '@shared/lib/i18n/model/localeStore';

import {
  clearHorizonCompletionsStorage,
  saveMonthlyCompletion,
  saveWeeklyCompletion,
  type HorizonCompletionEntry,
} from '../../horizonCompletionsStorage';
import {
  clearHorizonGoalsStorage,
  saveMonthlyGoalDocument,
  saveWeeklyGoalDocument,
  type HorizonGoalDocument,
} from '../../horizonGoalsStorage';
import { loadHistoryDailyStats, type HistoryDailyStatRow } from '../../historyStorage';

import { getSeedCategoryLabel } from '../seedCatalogConstants';
import type { DevMockSeedModule } from '../types';
import { getHorizonCompletionCopy } from './horizonCompletionCopy';

const WEEKLY_SEED_COUNT = 12;
const MONTHLY_SEED_COUNT = 3;

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  date.setDate(date.getDate() + deltaDays);
  return formatDateKey(date);
}

function getWeekStartKey(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  const dow = date.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return addDaysToDateKey(dateKey, mondayOffset);
}

function getMonthKey(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey.slice(0, 7);
  return `${m[1]}-${m[2]}`;
}

function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) return monthKey;
  const date = new Date(Number(m[1]), Number(m[2]) - 1 + deltaMonths, 1, 12, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatWeekLabel(weekStartKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStartKey.trim());
  if (!m) return weekStartKey;
  const month = Number(m[2]);
  const day = Number(m[3]);
  const weekOfMonth = Math.max(1, Math.ceil(day / 7));
  return getHorizonCompletionCopy(getAppLocale()).formatWeekLabel(month, weekOfMonth);
}

function formatMonthLabel(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) return monthKey;
  return getHorizonCompletionCopy(getAppLocale()).formatMonthLabel(Number(m[1]), Number(m[2]));
}

function isBetween(dateKey: string, startDateKey: string, endDateKey: string): boolean {
  return dateKey >= startDateKey && dateKey <= endDateKey;
}

function aggregateCategoryCounts(
  rows: HistoryDailyStatRow[],
  startDateKey: string,
  endDateKey: string,
): Array<{ key: string; count: number }> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    if (!isBetween(row.dateKey, startDateKey, endDateKey)) continue;
    for (const [key, raw] of Object.entries(row.categoryCompletions ?? {})) {
      const count = Math.max(0, Math.floor(Number(raw) || 0));
      if (count <= 0) continue;
      map[key] = (map[key] ?? 0) + count;
    }
  }
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function formatActivitySummary(rows: HistoryDailyStatRow[], startDateKey: string, endDateKey: string): string {
  const locale = getAppLocale();
  const copy = getHorizonCompletionCopy(locale);
  const top = aggregateCategoryCounts(rows, startDateKey, endDateKey).slice(0, 3);
  if (top.length === 0) return copy.emptyActivity;
  return top
    .map((row, idx) =>
      copy.activityItem(idx + 1, getSeedCategoryLabel(row.key, locale), row.count),
    )
    .join('\n');
}

function buildWeeklyStrategyDocument(weekIndex: number): HorizonGoalDocument {
  const templates = getHorizonCompletionCopy(getAppLocale()).buildWeekly(weekIndex);
  return templates[weekIndex % templates.length]!;
}

function buildMonthlyStrategyDocument(monthIndex: number): HorizonGoalDocument {
  const templates = getHorizonCompletionCopy(getAppLocale()).buildMonthly(monthIndex);
  return templates[monthIndex % templates.length]!;
}

function seedHorizonCompletions(historyRows: HistoryDailyStatRow[]): { weekly: number; monthly: number } {
  const today = formatDateKey(new Date());
  const currentWeekStart = getWeekStartKey(today);
  const currentMonthKey = getMonthKey(today);

  let weekly = 0;
  for (let i = 0; i < WEEKLY_SEED_COUNT; i += 1) {
    const weekStartKey = addDaysToDateKey(currentWeekStart, -7 * i);
    const weekEndKey = addDaysToDateKey(weekStartKey, 6);
    const activitySummary = formatActivitySummary(historyRows, weekStartKey, weekEndKey);
    const document = buildWeeklyStrategyDocument(i);
    saveWeeklyGoalDocument(weekStartKey, document);
    const entry: HorizonCompletionEntry = {
      periodKey: weekStartKey,
      label: formatWeekLabel(weekStartKey),
      completedAt: `${weekEndKey}T20:00:00.000Z`,
      summaryText: activitySummary,
      document,
    };
    saveWeeklyCompletion(entry);
    weekly += 1;
  }

  let monthly = 0;
  for (let i = 0; i < MONTHLY_SEED_COUNT; i += 1) {
    const monthKey = shiftMonthKey(currentMonthKey, -i);
    const monthStart = `${monthKey}-01`;
    const monthEndMatch = /^(\d{4})-(\d{2})$/.exec(monthKey);
    const monthEnd =
      monthEndMatch
        ? `${monthKey}-${String(new Date(Number(monthEndMatch[1]), Number(monthEndMatch[2]), 0, 12, 0, 0, 0).getDate()).padStart(2, '0')}`
        : monthStart;
    const activitySummary = formatActivitySummary(historyRows, monthStart, monthEnd);
    const document = buildMonthlyStrategyDocument(i);
    saveMonthlyGoalDocument(monthKey, document);
    const entry: HorizonCompletionEntry = {
      periodKey: monthKey,
      label: formatMonthLabel(monthKey),
      completedAt: `${monthEnd}T20:00:00.000Z`,
      summaryText: activitySummary,
      document,
    };
    saveMonthlyCompletion(entry);
    monthly += 1;
  }

  return { weekly, monthly };
}

/** history-daily 모듈 이후에 실행해야 한다. */
export const horizonCompletionMockSeed: DevMockSeedModule = {
  id: 'horizon-completions',
  version: 6,
  async seed() {
    const historyRows = loadHistoryDailyStats();
    const horizon = seedHorizonCompletions(historyRows);
    return {
      weeklyCompletions: horizon.weekly,
      monthlyCompletions: horizon.monthly,
    };
  },
  async clear() {
    clearHorizonCompletionsStorage();
    clearHorizonGoalsStorage();
  },
};
