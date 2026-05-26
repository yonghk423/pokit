import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type HorizonCompletionKind = 'weekly' | 'monthly';

export type HorizonCompletionEntry = {
  periodKey: string;
  label: string;
  completedAt: string;
  /** 완료 시점 전략 본문 스냅샷(통계 목록 표시용) */
  summaryText?: string;
};

type Persisted = {
  v: 1;
  weekly: Record<string, HorizonCompletionEntry>;
  monthly: Record<string, HorizonCompletionEntry>;
};

const EMPTY: Persisted = { v: 1, weekly: {}, monthly: {} };

function loadAll(): Persisted {
  const raw = localStorageClient.getJson<Persisted>(StorageKeys.horizonCompletions);
  if (!raw || raw.v !== 1) return { ...EMPTY };
  return {
    v: 1,
    weekly: raw.weekly && typeof raw.weekly === 'object' ? raw.weekly : {},
    monthly: raw.monthly && typeof raw.monthly === 'object' ? raw.monthly : {},
  };
}

function saveAll(data: Persisted): void {
  localStorageClient.setJson(StorageKeys.horizonCompletions, data);
}

export function loadWeeklyCompletion(weekStartKey: string): HorizonCompletionEntry | null {
  return loadAll().weekly[weekStartKey] ?? null;
}

export function loadMonthlyCompletion(monthKey: string): HorizonCompletionEntry | null {
  return loadAll().monthly[monthKey] ?? null;
}

export function saveWeeklyCompletion(entry: HorizonCompletionEntry): void {
  const all = loadAll();
  saveAll({ ...all, weekly: { ...all.weekly, [entry.periodKey]: entry } });
}

export function saveMonthlyCompletion(entry: HorizonCompletionEntry): void {
  const all = loadAll();
  saveAll({ ...all, monthly: { ...all.monthly, [entry.periodKey]: entry } });
}

export function clearWeeklyCompletion(weekStartKey: string): void {
  const all = loadAll();
  if (!all.weekly[weekStartKey]) return;
  const next = { ...all.weekly };
  delete next[weekStartKey];
  saveAll({ ...all, weekly: next });
}

export function clearMonthlyCompletion(monthKey: string): void {
  const all = loadAll();
  if (!all.monthly[monthKey]) return;
  const next = { ...all.monthly };
  delete next[monthKey];
  saveAll({ ...all, monthly: next });
}

function sortEntries(map: Record<string, HorizonCompletionEntry>): HorizonCompletionEntry[] {
  return Object.values(map).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function listWeeklyCompletions(): HorizonCompletionEntry[] {
  return sortEntries(loadAll().weekly);
}

export function listMonthlyCompletions(): HorizonCompletionEntry[] {
  return sortEntries(loadAll().monthly);
}
