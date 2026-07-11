import type { RoutineHistoryLayoutMode } from '@shared/lib/routineHistoryLayoutKey';

import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type DayPlanLayoutMode = RoutineHistoryLayoutMode;

export type DayPlanLayoutModeVisibility = Record<DayPlanLayoutMode, boolean>;

export const DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY: DayPlanLayoutModeVisibility = {
  bag: true,
  sections: false,
  spine: true,
};

const MODE_ORDER: readonly DayPlanLayoutMode[] = ['bag', 'sections', 'spine'];

export function normalizeDayPlanLayoutModeVisibility(raw: unknown): DayPlanLayoutModeVisibility {
  const base = { ...DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  for (const mode of MODE_ORDER) {
    if (typeof o[mode] === 'boolean') base[mode] = o[mode];
  }
  const enabledCount = MODE_ORDER.filter((mode) => base[mode]).length;
  if (enabledCount === 0) return { ...DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY };
  return base;
}

export function listVisibleDayPlanLayoutModes(
  visibility: DayPlanLayoutModeVisibility,
): DayPlanLayoutMode[] {
  return MODE_ORDER.filter((mode) => visibility[mode]);
}

export function coerceDayPlanLayoutMode(
  mode: DayPlanLayoutMode,
  visibility: DayPlanLayoutModeVisibility,
): DayPlanLayoutMode {
  const visible = listVisibleDayPlanLayoutModes(visibility);
  if (visible.includes(mode)) return mode;
  return visible[0] ?? 'bag';
}

export function loadDayPlanLayoutModeVisibility(): DayPlanLayoutModeVisibility {
  const raw =
    localStorageClient.getJson<{ dayPlanLayoutModeVisibility?: unknown }>(StorageKeys.settings);
  return normalizeDayPlanLayoutModeVisibility(raw?.dayPlanLayoutModeVisibility);
}

export function saveDayPlanLayoutModeVisibility(next: DayPlanLayoutModeVisibility): void {
  const normalized = normalizeDayPlanLayoutModeVisibility(next);
  const root =
    localStorageClient.getJson<Record<string, unknown>>(StorageKeys.settings) ?? {};
  localStorageClient.setJson(StorageKeys.settings, {
    ...root,
    dayPlanLayoutModeVisibility: normalized,
  });
}
