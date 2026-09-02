import type { RoutineHistoryLayoutMode } from '@shared/lib/routineHistoryLayoutKey';

import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type DayPlanLayoutMode = RoutineHistoryLayoutMode;

export type DayPlanLayoutModeVisibility = Record<DayPlanLayoutMode, boolean>;

export const DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY: DayPlanLayoutModeVisibility = {
  bag: true,
  // 시간대(sections) 모드는 잠정 유보 — UI에서만 숨김, 로직은 보존
  sections: false,
  spine: false,
};

/** 1.6.5 이전 기본값 — 시간대만 꺼져 있었음 */
const LEGACY_DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY: DayPlanLayoutModeVisibility = {
  bag: true,
  sections: false,
  spine: false,
};

const MODE_ORDER: readonly DayPlanLayoutMode[] = ['bag', 'sections', 'spine'];

const ALL_ON_MIGRATED_KEY = 'dayPlanLayoutModeVisibilityAllOnMigrated';

type SettingsWithLayoutVisibility = {
  dayPlanLayoutModeVisibility?: unknown;
  dayPlanLayoutModeVisibilityAllOnMigrated?: unknown;
};

function isExactVisibility(
  value: DayPlanLayoutModeVisibility,
  expected: DayPlanLayoutModeVisibility,
): boolean {
  return MODE_ORDER.every((mode) => value[mode] === expected[mode]);
}

export function normalizeDayPlanLayoutModeVisibility(raw: unknown): DayPlanLayoutModeVisibility {
  const base = { ...DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  for (const mode of MODE_ORDER) {
    if (typeof o[mode] === 'boolean') base[mode] = o[mode];
  }
  // 타임라인(spine)·시간대(sections) 기능은 임시 비활성화 상태로 강제한다.
  base.spine = false;
  base.sections = false;
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
  const root =
    localStorageClient.getJson<SettingsWithLayoutVisibility>(StorageKeys.settings) ?? {};
  const normalized = normalizeDayPlanLayoutModeVisibility(root.dayPlanLayoutModeVisibility);

  if (root.dayPlanLayoutModeVisibilityAllOnMigrated === true) {
    return normalized;
  }

  const shouldUpgradeToAllOn =
    root.dayPlanLayoutModeVisibility == null ||
    isExactVisibility(normalized, LEGACY_DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY);
  const next = shouldUpgradeToAllOn
    ? { ...DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY }
    : normalized;

  localStorageClient.setJson(StorageKeys.settings, {
    ...root,
    dayPlanLayoutModeVisibility: next,
    [ALL_ON_MIGRATED_KEY]: true,
  });
  return next;
}

export function saveDayPlanLayoutModeVisibility(next: DayPlanLayoutModeVisibility): void {
  const normalized = normalizeDayPlanLayoutModeVisibility(next);
  const root =
    localStorageClient.getJson<Record<string, unknown>>(StorageKeys.settings) ?? {};
  localStorageClient.setJson(StorageKeys.settings, {
    ...root,
    dayPlanLayoutModeVisibility: normalized,
    [ALL_ON_MIGRATED_KEY]: true,
  });
}
