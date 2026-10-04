import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ScheduledRoutineAssignment = {
  categoryKeys: string[];
};

export type ScheduledRoutinePlanPersisted = {
  assignmentsByDate: Record<string, ScheduledRoutineAssignment>;
};

function normalizeKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const key = item.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function normalizeScheduledRoutinePlan(
  raw: unknown,
): ScheduledRoutinePlanPersisted {
  if (!raw || typeof raw !== 'object') return { assignmentsByDate: {} };
  const map = (raw as { assignmentsByDate?: unknown }).assignmentsByDate;
  if (!map || typeof map !== 'object') return { assignmentsByDate: {} };
  const assignmentsByDate: Record<string, ScheduledRoutineAssignment> = {};
  for (const [dateKey, value] of Object.entries(map as Record<string, unknown>)) {
    if (!DATE_KEY_RE.test(dateKey)) continue;
    const keys =
      value && typeof value === 'object'
        ? normalizeKeys((value as { categoryKeys?: unknown }).categoryKeys)
        : normalizeKeys(value);
    if (keys.length === 0) continue;
    assignmentsByDate[dateKey] = { categoryKeys: keys };
  }
  return { assignmentsByDate };
}

export function loadScheduledRoutinePlan(): ScheduledRoutinePlanPersisted {
  const raw = localStorageClient.getJson<unknown>(StorageKeys.scheduledRoutinePlan);
  return normalizeScheduledRoutinePlan(raw);
}

export function saveScheduledRoutinePlan(plan: ScheduledRoutinePlanPersisted): void {
  localStorageClient.setJson(StorageKeys.scheduledRoutinePlan, normalizeScheduledRoutinePlan(plan));
}

export function getScheduledCategoryKeysForDate(
  plan: ScheduledRoutinePlanPersisted,
  dateKey: string,
): string[] {
  if (!DATE_KEY_RE.test(dateKey)) return [];
  return plan.assignmentsByDate[dateKey]?.categoryKeys ?? [];
}

export function setScheduledCategoryKeysForDate(
  plan: ScheduledRoutinePlanPersisted,
  dateKey: string,
  categoryKeys: string[],
): ScheduledRoutinePlanPersisted {
  if (!DATE_KEY_RE.test(dateKey)) return plan;
  const keys = normalizeKeys(categoryKeys);
  const next = { ...plan.assignmentsByDate };
  if (keys.length === 0) {
    delete next[dateKey];
  } else {
    next[dateKey] = { categoryKeys: keys };
  }
  return { assignmentsByDate: next };
}
