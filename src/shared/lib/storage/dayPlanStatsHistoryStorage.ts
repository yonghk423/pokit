import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type DayPlanStatsDayRow = {
  dateKey: string;
  /** 카테고리 키 → 그날 완료한 플로우 블록 수 */
  completedByCategory: Record<string, number>;
};

type Persisted = { v: 1; days: DayPlanStatsDayRow[] };

const MAX_DAYS = 400;

function normalizeRow(row: DayPlanStatsDayRow): DayPlanStatsDayRow {
  const completedByCategory: Record<string, number> = {};
  for (const [k, v] of Object.entries(row.completedByCategory ?? {})) {
    const n = Math.max(0, Math.floor(Number(v)));
    if (!Number.isFinite(n) || n <= 0) continue;
    completedByCategory[k] = n;
  }
  return { dateKey: row.dateKey.trim(), completedByCategory };
}

export function loadDayPlanStatsHistory(): DayPlanStatsDayRow[] {
  const raw = localStorageClient.getJson<Persisted>(StorageKeys.dayPlanStatsHistory);
  if (!raw || raw.v !== 1 || !Array.isArray(raw.days)) return [];
  return raw.days
    .filter((d): d is DayPlanStatsDayRow => typeof d?.dateKey === 'string' && d.dateKey.length >= 8)
    .map((d) => normalizeRow(d));
}

function saveDays(days: DayPlanStatsDayRow[]): void {
  const byKey = new Map<string, DayPlanStatsDayRow>();
  for (const d of days) {
    byKey.set(d.dateKey, normalizeRow(d));
  }
  const sorted = [...byKey.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  const capped = sorted.slice(0, MAX_DAYS);
  localStorageClient.setJson(StorageKeys.dayPlanStatsHistory, { v: 1, days: capped });
}

/** 같은 `dateKey`는 최신 행으로 덮어씁니다. */
export function mergeDayPlanStatsDay(row: DayPlanStatsDayRow): void {
  const next = loadDayPlanStatsHistory().filter((d) => d.dateKey !== row.dateKey);
  next.push(normalizeRow(row));
  saveDays(next);
}
