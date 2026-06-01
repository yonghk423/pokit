import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type HistoryDailyStatRow = {
  dateKey: string;
  focusMinutes: number;
  completedFlowCount: number;
  sessionCount: number;
  completionRate: number;
  categoryMinutes: Record<string, number>;
  categoryCompletions?: Record<string, number>;
};

export type HistoryAchievementRow = {
  id: string;
  kind: 'streak' | 'minutes' | 'completion';
  unlockedAt: string;
  title: string;
  description?: string;
};

export type HistoryMetaRow = {
  lastUpdatedAt: string;
  schemaVersion: 1;
};

type PersistedDaily = { v: 1; rows: HistoryDailyStatRow[] };
type PersistedAchievements = { v: 1; rows: HistoryAchievementRow[] };
type PersistedMeta = { v: 1; row: HistoryMetaRow };

const MAX_DAILY_ROWS = 730;
const MAX_ACHIEVEMENT_ROWS = 500;

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

function normalizeCategoryMinutes(source: Record<string, number> | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(source ?? {})) {
    const k = key.trim();
    if (!k) continue;
    const n = clampInt(raw, 0);
    if (n <= 0) continue;
    out[k] = n;
  }
  return out;
}

function normalizeCategoryCounts(
  source: Record<string, number> | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(source ?? {})) {
    const k = key.trim();
    if (!k) continue;
    const n = clampInt(raw, 0);
    if (n <= 0) continue;
    out[k] = n;
  }
  return out;
}

function normalizeDaily(row: HistoryDailyStatRow): HistoryDailyStatRow {
  const categoryCompletions = normalizeCategoryCounts(row.categoryCompletions);
  const legacyMinutes = normalizeCategoryMinutes(row.categoryMinutes);
  const mergedCompletions =
    Object.keys(categoryCompletions).length > 0
      ? categoryCompletions
      : Object.fromEntries(
          Object.keys(legacyMinutes).map((key) => [key, 1]),
        );

  const completedFlowCountRaw = clampInt(row.completedFlowCount, 0);
  const completedFlowCountFromCategories = Object.values(mergedCompletions).reduce(
    (sum, n) => sum + clampInt(n, 0),
    0,
  );
  const completedFlowCount = Math.max(completedFlowCountRaw, completedFlowCountFromCategories);
  const sessionCount = Math.max(clampInt(row.sessionCount, 0), completedFlowCount);

  return {
    dateKey: row.dateKey.trim(),
    focusMinutes: 0,
    completedFlowCount,
    sessionCount,
    completionRate: clampRate(row.completionRate),
    categoryMinutes: {},
    categoryCompletions: mergedCompletions,
  };
}

function normalizeAchievement(row: HistoryAchievementRow): HistoryAchievementRow | null {
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

export function loadHistoryDailyStats(): HistoryDailyStatRow[] {
  const raw = localStorageClient.getJson<PersistedDaily>(StorageKeys.historyDailyStats);
  if (!raw || raw.v !== 1 || !Array.isArray(raw.rows)) return [];
  return raw.rows
    .filter((r): r is HistoryDailyStatRow => typeof r?.dateKey === 'string' && r.dateKey.length >= 8)
    .map((r) => normalizeDaily(r))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function saveHistoryDailyStats(rows: HistoryDailyStatRow[]): void {
  const map = new Map<string, HistoryDailyStatRow>();
  for (const row of rows) {
    const normalized = normalizeDaily(row);
    if (!normalized.dateKey) continue;
    map.set(normalized.dateKey, normalized);
  }
  const deduped = [...map.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, MAX_DAILY_ROWS);
  localStorageClient.setJson<PersistedDaily>(StorageKeys.historyDailyStats, { v: 1, rows: deduped });
}

export function loadHistoryAchievements(): HistoryAchievementRow[] {
  const raw = localStorageClient.getJson<PersistedAchievements>(StorageKeys.historyAchievements);
  if (!raw || raw.v !== 1 || !Array.isArray(raw.rows)) return [];
  return raw.rows
    .map((r) => normalizeAchievement(r))
    .filter((r): r is HistoryAchievementRow => r !== null)
    .sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt));
}

export function saveHistoryAchievements(rows: HistoryAchievementRow[]): void {
  const map = new Map<string, HistoryAchievementRow>();
  for (const row of rows) {
    const normalized = normalizeAchievement(row);
    if (!normalized) continue;
    map.set(normalized.id, normalized);
  }
  const deduped = [...map.values()]
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
    .slice(0, MAX_ACHIEVEMENT_ROWS);
  localStorageClient.setJson<PersistedAchievements>(StorageKeys.historyAchievements, { v: 1, rows: deduped });
}

export function loadHistoryMeta(): HistoryMetaRow | null {
  const raw = localStorageClient.getJson<PersistedMeta>(StorageKeys.historyMeta);
  if (!raw || raw.v !== 1 || !raw.row) return null;
  return {
    lastUpdatedAt: String(raw.row.lastUpdatedAt || ''),
    schemaVersion: 1,
  };
}

export function saveHistoryMeta(row: HistoryMetaRow): void {
  localStorageClient.setJson<PersistedMeta>(StorageKeys.historyMeta, {
    v: 1,
    row: {
      lastUpdatedAt: String(row.lastUpdatedAt || ''),
      schemaVersion: 1,
    },
  });
}

export function clearHistoryStorage(): void {
  localStorageClient.removeItem(StorageKeys.historyDailyStats);
  localStorageClient.removeItem(StorageKeys.historyAchievements);
  localStorageClient.removeItem(StorageKeys.historyMeta);
}

