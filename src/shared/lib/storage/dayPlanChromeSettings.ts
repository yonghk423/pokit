import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type DayPlanChromeSettings = {
  /** 오늘 탭 헤더 목록·할 일 아이콘 숨김 */
  hideLayoutIcons: boolean;
  /** 오늘 탭 「오늘의 한 줄」 숨김 */
  hideDailyQuote: boolean;
  /**
   * true면 행 오른쪽 완료 체크를 숨기고,
   * 루틴 아코디언(펼침) 안에 완료 버튼을 둔다.
   */
  completeInAccordion: boolean;
  /** 완료한 루틴의 「완료!」 마스킹 테이프 숨김 */
  hideCompleteTape: boolean;
};

export const DEFAULT_DAY_PLAN_CHROME_SETTINGS: DayPlanChromeSettings = {
  hideLayoutIcons: false,
  hideDailyQuote: false,
  completeInAccordion: false,
  hideCompleteTape: false,
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
  if (typeof o.hideDailyQuote === 'boolean') {
    base.hideDailyQuote = o.hideDailyQuote;
  }
  if (typeof o.completeInAccordion === 'boolean') {
    base.completeInAccordion = o.completeInAccordion;
  }
  if (typeof o.hideCompleteTape === 'boolean') {
    base.hideCompleteTape = o.hideCompleteTape;
  } else if (typeof o.showCompleteTape === 'boolean') {
    /** 레거시 showCompleteTape — 표시 ON이면 숨김 OFF */
    base.hideCompleteTape = !o.showCompleteTape;
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
