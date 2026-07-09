import type { PlanMode } from '../model/planMode';
import { normalizeHistoryRecordKey } from '@shared/lib/routineHistoryLayoutKey';

type RoutineHistoryByDate = Record<string, string[]>;

type DraftSlice = {
  planMode: PlanMode;
  priorityPlanDateKey: string;
  priorityPlanDateKeyEnd: string;
  routineHistoryPendingByDate: RoutineHistoryByDate;
  routineHistoryPlannedKeysByDate: RoutineHistoryByDate;
};

export function normalizeRoutineHistoryByDate(raw: unknown): RoutineHistoryByDate {
  if (!raw || typeof raw !== 'object') return {};
  const out: RoutineHistoryByDate = {};
  for (const [dateKey, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    if (!Array.isArray(value)) continue;
    const keys = value.filter((k): k is string => typeof k === 'string' && k.trim().length > 0);
    if (keys.length > 0) out[dateKey] = keys;
  }
  return out;
}

export function isPriorityPlanDateInRange(
  dateKey: string,
  priorityPlanDateKey: string,
  priorityPlanDateKeyEnd: string,
): boolean {
  const lo = priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKey : priorityPlanDateKeyEnd;
  const hi = priorityPlanDateKey <= priorityPlanDateKeyEnd ? priorityPlanDateKeyEnd : priorityPlanDateKey;
  return dateKey >= lo && dateKey <= hi;
}

export function shouldTrackRoutineHistoryForDate(s: DraftSlice, dateKey: string): boolean {
  if (s.planMode !== 'priority') return false;
  return isPriorityPlanDateInRange(dateKey, s.priorityPlanDateKey, s.priorityPlanDateKeyEnd);
}

export function appendRoutineHistoryPending(
  pendingByDate: RoutineHistoryByDate,
  dateKey: string,
  categoryKey: string,
): RoutineHistoryByDate {
  const trimmed = normalizeHistoryRecordKey(categoryKey);
  if (!trimmed) return pendingByDate;
  const prev = pendingByDate[dateKey] ?? [];
  if (prev.some((key) => normalizeHistoryRecordKey(key) === trimmed)) return pendingByDate;
  return { ...pendingByDate, [dateKey]: [...prev, trimmed] };
}

export function removeRoutineHistoryPending(
  pendingByDate: RoutineHistoryByDate,
  dateKey: string,
  categoryKey: string,
): RoutineHistoryByDate {
  const target = normalizeHistoryRecordKey(categoryKey);
  const prev = pendingByDate[dateKey];
  if (!prev || prev.length === 0) return pendingByDate;
  const next = prev.filter((key) => normalizeHistoryRecordKey(key) !== target);
  if (next.length === prev.length) return pendingByDate;
  if (next.length === 0) {
    const copy = { ...pendingByDate };
    delete copy[dateKey];
    return copy;
  }
  return { ...pendingByDate, [dateKey]: next };
}

export function snapshotRoutinePlannedKeys(
  plannedByDate: RoutineHistoryByDate,
  dateKey: string,
  order: string[],
): RoutineHistoryByDate {
  if (order.length === 0) return plannedByDate;
  return { ...plannedByDate, [dateKey]: [...order] };
}

export function clearRoutineHistoryPendingForDate(
  pendingByDate: RoutineHistoryByDate,
  dateKey: string,
): RoutineHistoryByDate {
  if (!pendingByDate[dateKey]) return pendingByDate;
  const next = { ...pendingByDate };
  delete next[dateKey];
  return next;
}
