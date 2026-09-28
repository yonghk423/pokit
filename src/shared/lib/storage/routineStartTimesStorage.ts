import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

/** 카테고리(루틴)별 사용자가 직접 맞춘 시작·종료 시각 */
export type RoutineStartTimeEntry = {
  startMinutes: number;
  endMinutes: number;
  /** 종료가 다음 달력일인 경우 */
  endsNextCalendarDay?: boolean;
};

export type PersistedRoutineStartTimes = {
  byCategoryKey: Record<string, RoutineStartTimeEntry>;
};

function normalizeMinutes(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const m = Math.floor(raw);
  if (m < 0 || m > 24 * 60) return null;
  return m;
}

function normalizeEntry(raw: unknown): RoutineStartTimeEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const startMinutes = normalizeMinutes(o.startMinutes);
  const endMinutes = normalizeMinutes(o.endMinutes);
  if (startMinutes === null || endMinutes === null) return null;
  const endsNext = o.endsNextCalendarDay === true;
  if (endsNext) {
    if (startMinutes >= 24 * 60 || endMinutes >= 24 * 60) return null;
    if (24 * 60 - startMinutes + endMinutes <= 0) return null;
  } else if (endMinutes <= startMinutes) {
    return null;
  }
  return {
    startMinutes,
    endMinutes,
    ...(endsNext ? { endsNextCalendarDay: true as const } : {}),
  };
}

export function normalizeRoutineStartTimes(raw: unknown): PersistedRoutineStartTimes {
  if (!raw || typeof raw !== 'object') return { byCategoryKey: {} };
  const row = raw as Record<string, unknown>;
  const source =
    row.byCategoryKey && typeof row.byCategoryKey === 'object' && !Array.isArray(row.byCategoryKey)
      ? (row.byCategoryKey as Record<string, unknown>)
      : {};
  const byCategoryKey: Record<string, RoutineStartTimeEntry> = {};
  for (const [rawKey, value] of Object.entries(source)) {
    const key = rawKey.trim();
    if (!key) continue;
    const entry = normalizeEntry(value);
    if (!entry) continue;
    byCategoryKey[key] = entry;
  }
  return { byCategoryKey };
}

export function loadRoutineStartTimes(): PersistedRoutineStartTimes {
  const raw = localStorageClient.getJson<unknown>(StorageKeys.routineStartTimes);
  return normalizeRoutineStartTimes(raw);
}

export function saveRoutineStartTimes(next: PersistedRoutineStartTimes): void {
  const normalized = normalizeRoutineStartTimes(next);
  localStorageClient.setJson(StorageKeys.routineStartTimes, normalized);
}
