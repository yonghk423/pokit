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
  /** 오늘 탭 상단 공지 바로가기 표시 (기본 OFF) */
  showTopAnnouncementsButton: boolean;
  /** 오늘 탭 상단 문의 바로가기 표시 (기본 OFF) */
  showTopContactButton: boolean;
  /** 스토어 업데이트 사전 안내 포스트잇 숨김 (기본 OFF = 표시) */
  hideAppUpdateNudge: boolean;
};

export const DEFAULT_DAY_PLAN_CHROME_SETTINGS: DayPlanChromeSettings = {
  hideLayoutIcons: false,
  hideDailyQuote: false,
  completeInAccordion: false,
  hideCompleteTape: false,
  showTopAnnouncementsButton: false,
  showTopContactButton: false,
  hideAppUpdateNudge: false,
};

/** 공지·문의 상단 버튼 기본 숨김 + 표시 토글 전환 1회 마이그레이션 */
const TOP_SUPPORT_SHOW_DEFAULT_MIGRATED_KEY = 'pokit:chrome-top-support-show-default-v2';

type SettingsWithChrome = {
  dayPlanChromeSettings?: unknown;
};

function resolveShowTopButton(
  o: Record<string, unknown>,
  showKey: 'showTopAnnouncementsButton' | 'showTopContactButton',
  hideKey: 'hideTopAnnouncementsButton' | 'hideTopContactButton',
  legacyHideTopSupport: boolean | undefined,
  fallback: boolean,
): boolean {
  if (typeof o[showKey] === 'boolean') return o[showKey] as boolean;
  if (typeof o[hideKey] === 'boolean') return !(o[hideKey] as boolean);
  if (legacyHideTopSupport !== undefined) return !legacyHideTopSupport;
  return fallback;
}

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
  const legacyHideTopSupport =
    typeof o.hideTopSupportButtons === 'boolean' ? o.hideTopSupportButtons : undefined;
  base.showTopAnnouncementsButton = resolveShowTopButton(
    o,
    'showTopAnnouncementsButton',
    'hideTopAnnouncementsButton',
    legacyHideTopSupport,
    base.showTopAnnouncementsButton,
  );
  base.showTopContactButton = resolveShowTopButton(
    o,
    'showTopContactButton',
    'hideTopContactButton',
    legacyHideTopSupport,
    base.showTopContactButton,
  );
  if (typeof o.hideAppUpdateNudge === 'boolean') {
    base.hideAppUpdateNudge = o.hideAppUpdateNudge;
  }
  return base;
}

function persistDayPlanChromeSettings(next: DayPlanChromeSettings): void {
  const root = localStorageClient.getJson<Record<string, unknown>>(StorageKeys.settings) ?? {};
  localStorageClient.setJson(StorageKeys.settings, {
    ...root,
    dayPlanChromeSettings: next,
  });
}

/** 예전 기본값(표시)으로 저장된 기기도 공지·문의 버튼을 한 번 숨김으로 맞춘다. */
function migrateTopSupportButtonsHiddenByDefault(
  settings: DayPlanChromeSettings,
): DayPlanChromeSettings {
  if (localStorageClient.getItemRaw(TOP_SUPPORT_SHOW_DEFAULT_MIGRATED_KEY) === '1') {
    return settings;
  }
  const next = {
    ...settings,
    showTopAnnouncementsButton: false,
    showTopContactButton: false,
  };
  persistDayPlanChromeSettings(next);
  localStorageClient.setItemRaw(TOP_SUPPORT_SHOW_DEFAULT_MIGRATED_KEY, '1');
  return next;
}

export function loadDayPlanChromeSettings(): DayPlanChromeSettings {
  const root = localStorageClient.getJson<SettingsWithChrome>(StorageKeys.settings) ?? {};
  return migrateTopSupportButtonsHiddenByDefault(
    normalizeDayPlanChromeSettings(root.dayPlanChromeSettings),
  );
}

export function saveDayPlanChromeSettings(next: DayPlanChromeSettings): void {
  const normalized = normalizeDayPlanChromeSettings(next);
  persistDayPlanChromeSettings(normalized);
}
