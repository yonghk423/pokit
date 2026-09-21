import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type DayPlanChromeSettings = {
  /** 오늘 탭 헤더 목록·할 일 아이콘 숨김 */
  hideLayoutIcons: boolean;
};

export const DEFAULT_DAY_PLAN_CHROME_SETTINGS: DayPlanChromeSettings = {
  hideLayoutIcons: false,
};

type SettingsWithChrome = {
  dayPlanChromeSettings?: unknown;
};

export function normalizeDayPlanChromeSettings(raw: unknown): DayPlanChromeSettings {
  const base = { ...DEFAULT_DAY_PLAN_CHROME_SETTINGS };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  if (typeof o.hideLayoutIcons === 'boolean') {
    base.hideLayoutIcons = o.hideLayoutIcons;
  }
  return base;
}

export function loadDayPlanChromeSettings(): DayPlanChromeSettings {
  const root = localStorageClient.getJson<SettingsWithChrome>(StorageKeys.settings) ?? {};
  return normalizeDayPlanChromeSettings(root.dayPlanChromeSettings);
}

export function saveDayPlanChromeSettings(next: DayPlanChromeSettings): void {
  const normalized = normalizeDayPlanChromeSettings(next);
  const root = localStorageClient.getJson<Record<string, unknown>>(StorageKeys.settings) ?? {};
  localStorageClient.setJson(StorageKeys.settings, {
    ...root,
    dayPlanChromeSettings: normalized,
  });
}
