import { create } from 'zustand';

import { loadDayPlanDraft, saveDayPlanDraft, syncWidgetTimelineFromStorage, normalizeDayMealSlot, normalizeCategoryMealSlots, type DayMealSlot } from '@shared/lib/storage';

import { getLocalMinutesOfDayNow } from '../lib/dayPlanTime';
import { defaultPriorityWindowFromNow } from '../lib/dayPlanTimeMath';
import { cycleItemPriority, normalizeItemPriority } from '../lib/itemPriority';
import { addDaysToLocalDateKey, getLocalDateKey } from '../lib/localDateKey';
import { parseHHmmToMinutes } from '../lib/parseTime';
import { isOvernightPriorityWindow } from '../lib/priorityRoutineWindow';
import {
  buildPrioritySectionCompletionKey,
  parsePrioritySectionCompletionKey,
  toRoutineHistoryCategoryKey,
  migrateCompletionKeyInList,
} from '../lib/prioritySectionCompletionKey';
import {
  appendRoutineHistoryPending,
  clearRoutineHistoryPendingForDate,
  normalizeRoutineHistoryByDate,
  removeRoutineHistoryPending,
  shouldTrackRoutineHistoryForDate,
  snapshotRoutinePlannedKeys,
} from '../lib/routineHistorySnapshot';
import type { PlanMode } from './planMode';
import type { TodoPriority } from './types';
import {
  registerDraftSyncTodayTabAccessors,
  syncTodayTabWithFixedRoutineApply,
} from '../lib/runSyncTodayTabWithFixedRoutineApply';

type DayPlanDraftState = {
  planMode: PlanMode;
  isFocusStarted: boolean;
  completedFocusCategoryKeys: string[];
  /** 우선순위에서 항목을 뺐다가 다시 담을 때 플랜 완료만으로 취소선이 남지 않게 막는 키 */
  planCompletionDismissedKeys: string[];
  /** 우선 순위 일정 적용 기간 시작일 (YYYY-MM-DD) */
  priorityPlanDateKey: string;
  /** 우선 순위 일정 적용 기간 종료일 (YYYY-MM-DD) */
  priorityPlanDateKeyEnd: string;
  /**
   * 달력에서 시작·끝을 다르게 잡은 적 있음(여러 날짜 구간).
   * true면 자정 넘김에 따른 종료일 자동 보정을 하지 않음.
   */
  priorityPlanExplicitMultiDay: boolean;
  /** 자정 넘김으로 종료일을 자동으로 +1일 한 상태(시간을 다시 당일 안으로 돌리면 같은 날로 접음) */
  priorityOvernightEndAuto: boolean;
  priorityStart: string;
  priorityEnd: string;
  priorityCategoryOrder: string[];
  /** 담기 목록 항목별 중요도 — 미설정 시 보통 */
  priorityCategoryImportance: Record<string, TodoPriority>;
  /** 히스토리 데일리 진입 시 반영할 루틴 시간대 완료(담기 체크) */
  routineHistoryPendingByDate: Record<string, string[]>;
  /** 당일 담기 계획 스냅샷 — 구간 종료 후에도 완료율 분모 유지 */
  routineHistoryPlannedKeysByDate: Record<string, string[]>;
  /** 카테고리 표시명이 변경되면 증가 — 오늘 루틴 목록 라벨 재조회 */
  categoryLabelEpoch: number;
  /** 수분 알림 재동기화 요청 시 증가 — 실제 동기화는 앱 부트스트랩에서 단일 실행 */
  waterReminderSyncEpoch: number;
  quickMemoDraft: string;
  /** 데일리 담기 — 아침·점심·저녁 구간 헤더 레이아웃 (기본: 목록) */
  priorityMealSlotLayoutEnabled: boolean;
  /** 데일리 — 세로 스파인 타임라인 레이아웃 */
  prioritySpineLayoutEnabled: boolean;
  /** 담기 목록 — 고정 루틴 외 항목 시간대 */
  priorityMealSlotOverrides: Record<string, DayMealSlot>;
  /** 구간(시간대) 보기 — 사용자가 직접 지정한 시간대 (복수 선택 가능) */
  prioritySectionsMealSlots: Record<string, DayMealSlot[]>;
  isHydrated: boolean;
  hydrate: () => void;
  setPlanMode: (mode: PlanMode) => void;
  setIsFocusStarted: (value: boolean) => void;
  toggleFocusCategoryCompleted: (categoryKey: string) => void;
  /** 완료 체크(한 번만 추가) — 우선순위 행 완료 UI */
  addFocusCategoryCompleted: (categoryKey: string) => void;
  /** 우선순위 목록 변경 시 목록 밖 키 제거 */
  filterCompletedFocusKeysToPriorityOrder: (order: string[]) => void;
  clearCompletedFocusCategoryKeys: () => void;
  addPlanCompletionDismissedKey: (key: string) => void;
  clearPlanCompletionDismissedKeys: () => void;
  setPriorityPlanDateKey: (value: string) => void;
  setPriorityPlanDateKeyEnd: (value: string) => void;
  /** 달력 적용 시 명시 구간·자동 플래그까지 한 번에 */
  applyPriorityPlanCalendarRange: (lo: string, hi: string) => void;
  /** 시작·종료 시각과 단일/다중일 플래그에 맞춰 종료일 자동 보정 */
  syncOvernightPriorityPlanDates: () => void;
  /**
   * 적용 구간(종료일·종료 시각)이 현재보다 완전히 지났으면 오늘 기준 구간으로 전진.
   * 시작·종료 시각은 유지하고, 자정 넘김이면 종료일을 +1일로 설정한다.
   * 새 하루로 넘어가므로 담기·집중 상태도 초기화한다.
   */
  rollPriorityPlanForwardIfEnded: (now?: { nowKey?: string; nowMin?: number }) => void;
  setPriorityStart: (value: string) => void;
  setPriorityEnd: (value: string) => void;
  setPriorityCategoryOrder: (value: string[] | ((prev: string[]) => string[])) => void;
  /** 담기 목록 항목 중요도 순환 — 높음 → 보통 → 낮음 */
  cyclePriorityCategoryImportance: (categoryKey: string) => void;
  clearRoutineHistoryPendingForDate: (dateKey: string) => void;
  bumpCategoryLabelEpoch: () => void;
  bumpWaterReminderSyncEpoch: () => void;
  setQuickMemoDraft: (value: string) => void;
  setPriorityMealSlotLayoutEnabled: (value: boolean) => void;
  setPrioritySpineLayoutEnabled: (value: boolean) => void;
  setPriorityMealSlotOverride: (categoryKey: string, mealSlot: DayMealSlot | null) => void;
  /** 기존 지정을 유지한 채 누락 항목만 구간을 채웁니다. */
  mergePriorityMealSlotOverrides: (incoming: Record<string, DayMealSlot>) => void;
  setPrioritySectionsMealSlots: (categoryKey: string, mealSlots: DayMealSlot[] | null) => void;
  addPrioritySectionMealSlot: (categoryKey: string, mealSlot: DayMealSlot) => void;
  mergePrioritySectionsMealSlots: (incoming: Record<string, DayMealSlot[]>) => void;
  /** 구간 이동 시 슬롯별 완료 체크 키를 함께 옮깁니다. */
  migrateSectionCompletionOnSlotMove: (
    categoryKey: string,
    fromSlot: DayMealSlot,
    toSlot: DayMealSlot,
  ) => void;
  /** 오늘 담기 목록에서 항목을 완전히 종료 — 구간 만료 리셋과 같이 목록·완료 상태를 정리 */
  finishPriorityCategoryForToday: (categoryKey: string) => void;
};

function createInitialPriorityWindow() {
  const w = defaultPriorityWindowFromNow();
  return { priorityStart: w.startTime, priorityEnd: w.endTime };
}

function normalizePriorityMealSlotOverrides(raw: unknown): Record<string, DayMealSlot> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, DayMealSlot> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const trimmed = key.trim();
    const slot = normalizeDayMealSlot(value);
    if (trimmed && slot) out[trimmed] = slot;
  }
  return out;
}

/** 담기 순서 — 동일 categoryKey는 첫 등장만 유지 */
function dedupePriorityCategoryOrder(order: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawKey of order) {
    const key = rawKey.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function filterCompletionKeysForCategory(keys: readonly string[], categoryKey: string): string[] {
  return keys.filter((key) => parsePrioritySectionCompletionKey(key).categoryKey !== categoryKey);
}

function normalizePrioritySectionsMealSlots(raw: unknown): Record<string, DayMealSlot[]> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, DayMealSlot[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const trimmed = key.trim();
    const slots = normalizeCategoryMealSlots(value);
    if (trimmed && slots.length > 0) out[trimmed] = slots;
  }
  return out;
}

function pruneMealSlotRecordForOrder(
  record: Record<string, DayMealSlot>,
  order: readonly string[],
): Record<string, DayMealSlot> {
  const allowed = new Set(order);
  const next = { ...record };
  let changed = false;
  for (const key of Object.keys(next)) {
    if (!allowed.has(key)) {
      delete next[key];
      changed = true;
    }
  }
  return changed ? next : record;
}

function pruneMealSlotsArrayRecordForOrder(
  record: Record<string, DayMealSlot[]>,
  order: readonly string[],
): Record<string, DayMealSlot[]> {
  const allowed = new Set(order);
  const next = { ...record };
  let changed = false;
  for (const key of Object.keys(next)) {
    if (!allowed.has(key)) {
      delete next[key];
      changed = true;
    }
  }
  return changed ? next : record;
}

function normalizePriorityCategoryImportance(raw: unknown): Record<string, TodoPriority> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, TodoPriority> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const trimmed = key.trim();
    if (!trimmed) continue;
    const priority = normalizeItemPriority(value);
    if (priority !== 'medium') out[trimmed] = priority;
  }
  return out;
}

function prunePriorityCategoryImportanceForOrder(
  record: Record<string, TodoPriority>,
  order: readonly string[],
): Record<string, TodoPriority> {
  const allowed = new Set(order);
  const next = { ...record };
  let changed = false;
  for (const key of Object.keys(next)) {
    if (!allowed.has(key)) {
      delete next[key];
      changed = true;
    }
  }
  return changed ? next : record;
}

function createInitialState() {
  return {
    planMode: 'priority' as PlanMode,
    isFocusStarted: false,
    completedFocusCategoryKeys: [] as string[],
    planCompletionDismissedKeys: [] as string[],
    priorityPlanDateKey: getLocalDateKey(),
    priorityPlanDateKeyEnd: getLocalDateKey(),
    priorityPlanExplicitMultiDay: false,
    priorityOvernightEndAuto: false,
    ...createInitialPriorityWindow(),
    priorityCategoryOrder: [] as string[],
    priorityCategoryImportance: {} as Record<string, TodoPriority>,
    routineHistoryPendingByDate: {} as Record<string, string[]>,
    routineHistoryPlannedKeysByDate: {} as Record<string, string[]>,
    categoryLabelEpoch: 0,
    waterReminderSyncEpoch: 0,
    quickMemoDraft: '',
    priorityMealSlotLayoutEnabled: false,
    prioritySpineLayoutEnabled: false,
    priorityMealSlotOverrides: {} as Record<string, DayMealSlot>,
    prioritySectionsMealSlots: {} as Record<string, DayMealSlot[]>,
  };
}

export const useDayPlanDraftStore = create<DayPlanDraftState>((set, get) => ({
  ...createInitialState(),
  isHydrated: false,
  hydrate: () => {
    if (get().isHydrated) return;
    const raw = loadDayPlanDraft();
    if (!raw) {
      set({ isHydrated: true });
      syncTodayTabWithFixedRoutineApply();
      return;
    }

    const today = getLocalDateKey();
    const rangeLo =
      raw.priorityPlanDateKey <= raw.priorityPlanDateKeyEnd
        ? raw.priorityPlanDateKey
        : raw.priorityPlanDateKeyEnd;
    const rangeHi =
      raw.priorityPlanDateKey <= raw.priorityPlanDateKeyEnd
        ? raw.priorityPlanDateKeyEnd
        : raw.priorityPlanDateKey;
    const keepRange = rangeHi >= today;

    set({
      planMode:
        raw.planMode === 'quickMemo'
          ? 'quickMemo'
          : raw.planMode === 'todoList'
            ? 'todoList'
            : raw.planMode === 'reading'
              ? 'reading'
            : raw.planMode === 'dayNote'
              ? 'dayNote'
              : 'priority',
      isFocusStarted: Boolean(raw.isFocusStarted),
      completedFocusCategoryKeys: Array.isArray(raw.completedFocusCategoryKeys)
        ? raw.completedFocusCategoryKeys
        : [],
      planCompletionDismissedKeys: Array.isArray(raw.planCompletionDismissedKeys)
        ? raw.planCompletionDismissedKeys
        : [],
      priorityPlanDateKey: keepRange ? raw.priorityPlanDateKey : today,
      priorityPlanDateKeyEnd: keepRange ? raw.priorityPlanDateKeyEnd : today,
      priorityPlanExplicitMultiDay: keepRange ? Boolean(raw.priorityPlanExplicitMultiDay) : false,
      priorityOvernightEndAuto: keepRange ? Boolean(raw.priorityOvernightEndAuto) : false,
      priorityStart: typeof raw.priorityStart === 'string' ? raw.priorityStart : get().priorityStart,
      priorityEnd: typeof raw.priorityEnd === 'string' ? raw.priorityEnd : get().priorityEnd,
      priorityCategoryOrder: dedupePriorityCategoryOrder(
        Array.isArray(raw.priorityCategoryOrder) ? raw.priorityCategoryOrder : [],
      ),
      priorityCategoryImportance: normalizePriorityCategoryImportance(raw.priorityCategoryImportance),
      routineHistoryPendingByDate: normalizeRoutineHistoryByDate(raw.routineHistoryPendingByDate),
      routineHistoryPlannedKeysByDate: normalizeRoutineHistoryByDate(raw.routineHistoryPlannedKeysByDate),
      quickMemoDraft: typeof raw.quickMemoDraft === 'string' ? raw.quickMemoDraft : '',
      priorityMealSlotLayoutEnabled: Boolean(raw.priorityMealSlotLayoutEnabled),
      prioritySpineLayoutEnabled: Boolean(raw.prioritySpineLayoutEnabled),
      priorityMealSlotOverrides: normalizePriorityMealSlotOverrides(raw.priorityMealSlotOverrides),
      prioritySectionsMealSlots: normalizePrioritySectionsMealSlots(raw.prioritySectionsMealSlots),
      isHydrated: true,
    });
    syncTodayTabWithFixedRoutineApply();
  },
  setPlanMode: (mode) => {
    set({ planMode: mode });
    persistDayPlanDraft();
  },
  setIsFocusStarted: (value) => {
    set({ isFocusStarted: value });
    persistDayPlanDraft();
  },
  toggleFocusCategoryCompleted: (categoryKey) =>
    set((s) => {
      const removing = s.completedFocusCategoryKeys.includes(categoryKey);
      const completedFocusCategoryKeys = removing
        ? s.completedFocusCategoryKeys.filter((k) => k !== categoryKey)
        : [...s.completedFocusCategoryKeys, categoryKey];
      const today = getLocalDateKey();
      const historyCategoryKey = toRoutineHistoryCategoryKey(categoryKey);
      let routineHistoryPendingByDate = s.routineHistoryPendingByDate;
      if (shouldTrackRoutineHistoryForDate(s, today)) {
        routineHistoryPendingByDate = removing
          ? removeRoutineHistoryPending(routineHistoryPendingByDate, today, historyCategoryKey)
          : appendRoutineHistoryPending(routineHistoryPendingByDate, today, historyCategoryKey);
      }
      return { completedFocusCategoryKeys, routineHistoryPendingByDate };
    }),
  addFocusCategoryCompleted: (categoryKey) =>
    set((s) => {
      if (s.completedFocusCategoryKeys.includes(categoryKey)) return s;
      const today = getLocalDateKey();
      const completedFocusCategoryKeys = [...s.completedFocusCategoryKeys, categoryKey];
      const historyCategoryKey = toRoutineHistoryCategoryKey(categoryKey);
      if (!shouldTrackRoutineHistoryForDate(s, today)) {
        return { completedFocusCategoryKeys };
      }
      return {
        completedFocusCategoryKeys,
        routineHistoryPendingByDate: appendRoutineHistoryPending(
          s.routineHistoryPendingByDate,
          today,
          historyCategoryKey,
        ),
      };
    }),
  filterCompletedFocusKeysToPriorityOrder: (order) =>
    set((s) => {
      const next = s.completedFocusCategoryKeys.filter((k) => {
        const { categoryKey } = parsePrioritySectionCompletionKey(k);
        return order.includes(categoryKey);
      });
      if (
        next.length === s.completedFocusCategoryKeys.length &&
        next.every((k, i) => k === s.completedFocusCategoryKeys[i])
      ) {
        return s;
      }
      return {
        completedFocusCategoryKeys: next,
      };
    }),
  clearCompletedFocusCategoryKeys: () =>
    set((s) => {
      if (s.completedFocusCategoryKeys.length === 0) return s;
      return { completedFocusCategoryKeys: [] };
    }),
  addPlanCompletionDismissedKey: (key) =>
    set((s) => ({
      planCompletionDismissedKeys: s.planCompletionDismissedKeys.includes(key)
        ? s.planCompletionDismissedKeys
        : [...s.planCompletionDismissedKeys, key],
    })),
  clearPlanCompletionDismissedKeys: () =>
    set((s) => {
      if (s.planCompletionDismissedKeys.length === 0) return s;
      return { planCompletionDismissedKeys: [] };
    }),
  finishPriorityCategoryForToday: (categoryKey) =>
    set((s) => {
      const key = categoryKey.trim();
      if (!key || !s.priorityCategoryOrder.includes(key)) return s;

      const priorityCategoryOrder = s.priorityCategoryOrder.filter((k) => k !== key);
      const completedFocusCategoryKeys = filterCompletionKeysForCategory(
        s.completedFocusCategoryKeys,
        key,
      );
      const planCompletionDismissedKeys = filterCompletionKeysForCategory(
        s.planCompletionDismissedKeys,
        key,
      );
      const priorityMealSlotOverrides = pruneMealSlotRecordForOrder(
        s.priorityMealSlotOverrides,
        priorityCategoryOrder,
      );
      const prioritySectionsMealSlots = pruneMealSlotsArrayRecordForOrder(
        s.prioritySectionsMealSlots,
        priorityCategoryOrder,
      );
      const priorityCategoryImportance = prunePriorityCategoryImportanceForOrder(
        s.priorityCategoryImportance,
        priorityCategoryOrder,
      );
      const isFocusStarted = priorityCategoryOrder.length > 0 ? s.isFocusStarted : false;

      return {
        priorityCategoryOrder,
        completedFocusCategoryKeys,
        planCompletionDismissedKeys,
        priorityMealSlotOverrides,
        prioritySectionsMealSlots,
        priorityCategoryImportance,
        isFocusStarted,
      };
    }),
  setPriorityPlanDateKey: (value) => set({ priorityPlanDateKey: value }),
  setPriorityPlanDateKeyEnd: (value) => set({ priorityPlanDateKeyEnd: value }),
  applyPriorityPlanCalendarRange: (lo, hi) =>
    set({
      priorityPlanDateKey: lo,
      priorityPlanDateKeyEnd: hi,
      priorityPlanExplicitMultiDay: lo !== hi,
      priorityOvernightEndAuto: false,
    }),
  syncOvernightPriorityPlanDates: () => {
    const s = get();
    if (s.priorityPlanExplicitMultiDay) return;
    const rangeLo =
      s.priorityPlanDateKey <= s.priorityPlanDateKeyEnd
        ? s.priorityPlanDateKey
        : s.priorityPlanDateKeyEnd;
    const rangeHi =
      s.priorityPlanDateKey <= s.priorityPlanDateKeyEnd
        ? s.priorityPlanDateKeyEnd
        : s.priorityPlanDateKey;
    const overnight = isOvernightPriorityWindow(s.priorityStart, s.priorityEnd);
    if (overnight) {
      if (rangeLo === rangeHi) {
        const wantEnd = addDaysToLocalDateKey(rangeLo, 1);
        if (rangeHi !== wantEnd) {
          set({
            priorityPlanDateKey: rangeLo,
            priorityPlanDateKeyEnd: wantEnd,
            priorityOvernightEndAuto: true,
          });
        }
      }
    } else if (
      s.priorityOvernightEndAuto &&
      rangeHi === addDaysToLocalDateKey(rangeLo, 1)
    ) {
      set({
        priorityPlanDateKey: rangeLo,
        priorityPlanDateKeyEnd: rangeLo,
        priorityOvernightEndAuto: false,
      });
    }
  },
  rollPriorityPlanForwardIfEnded: (now) => {
    const s = get();
    if (s.planMode !== 'priority') return;
    const ps = parseHHmmToMinutes(s.priorityStart);
    const pe = parseHHmmToMinutes(s.priorityEnd);
    if (ps === null || pe === null) return;

    const today = now?.nowKey ?? getLocalDateKey();
    const nowMin = now?.nowMin ?? getLocalMinutesOfDayNow();
    const rangeHi =
      s.priorityPlanDateKey <= s.priorityPlanDateKeyEnd
        ? s.priorityPlanDateKeyEnd
        : s.priorityPlanDateKey;

    // 구간 종료 시각이 현재보다 과거인지 (00:00 종료는 종료일 00:00과 동일하게 취급)
    const ended = today > rangeHi || (today === rangeHi && nowMin >= pe);
    if (!ended) return;

    const overnight = isOvernightPriorityWindow(s.priorityStart, s.priorityEnd);
    const nextStart = today;
    const nextEnd = overnight ? addDaysToLocalDateKey(today, 1) : today;
    // 같은 날 일찍 끝난 경우(아직 날짜가 안 넘어감)는 그대로 둔다.
    if (s.priorityPlanDateKey === nextStart && s.priorityPlanDateKeyEnd === nextEnd) return;

    set({
      priorityPlanDateKey: nextStart,
      priorityPlanDateKeyEnd: nextEnd,
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: overnight,
      priorityCategoryOrder: [],
      priorityCategoryImportance: {},
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      isFocusStarted: false,
    });
  },
  setPriorityStart: (value) => set({ priorityStart: value }),
  setPriorityEnd: (value) => set({ priorityEnd: value }),
  setPriorityCategoryOrder: (value) =>
    set((s) => {
      const priorityCategoryOrder = dedupePriorityCategoryOrder(
        typeof value === 'function' ? value(s.priorityCategoryOrder) : value,
      );
      const today = getLocalDateKey();
      const routineHistoryPlannedKeysByDate =
        shouldTrackRoutineHistoryForDate(s, today) && priorityCategoryOrder.length > 0
          ? snapshotRoutinePlannedKeys(
              s.routineHistoryPlannedKeysByDate,
              today,
              priorityCategoryOrder,
            )
          : s.routineHistoryPlannedKeysByDate;
      const priorityMealSlotOverrides = pruneMealSlotRecordForOrder(
        s.priorityMealSlotOverrides,
        priorityCategoryOrder,
      );
      const prioritySectionsMealSlots = pruneMealSlotsArrayRecordForOrder(
        s.prioritySectionsMealSlots,
        priorityCategoryOrder,
      );
      const priorityCategoryImportance = prunePriorityCategoryImportanceForOrder(
        s.priorityCategoryImportance,
        priorityCategoryOrder,
      );
      return {
        priorityCategoryOrder,
        routineHistoryPlannedKeysByDate,
        priorityMealSlotOverrides,
        prioritySectionsMealSlots,
        priorityCategoryImportance,
      };
    }),
  cyclePriorityCategoryImportance: (categoryKey) =>
    set((s) => {
      const key = categoryKey.trim();
      if (!key || !s.priorityCategoryOrder.includes(key)) return s;
      const current = normalizeItemPriority(s.priorityCategoryImportance[key]);
      const next = cycleItemPriority(current);
      const priorityCategoryImportance = { ...s.priorityCategoryImportance };
      if (next === 'medium') {
        delete priorityCategoryImportance[key];
      } else {
        priorityCategoryImportance[key] = next;
      }
      return { priorityCategoryImportance };
    }),
  clearRoutineHistoryPendingForDate: (dateKey) =>
    set((s) => ({
      routineHistoryPendingByDate: clearRoutineHistoryPendingForDate(
        s.routineHistoryPendingByDate,
        dateKey,
      ),
    })),
  bumpCategoryLabelEpoch: () =>
    set((s) => ({ categoryLabelEpoch: s.categoryLabelEpoch + 1 })),
  bumpWaterReminderSyncEpoch: () =>
    set((s) => ({ waterReminderSyncEpoch: s.waterReminderSyncEpoch + 1 })),
  setQuickMemoDraft: (value) => set({ quickMemoDraft: value }),
  setPriorityMealSlotLayoutEnabled: (value) =>
    set((s) => ({
      priorityMealSlotLayoutEnabled: value,
      prioritySpineLayoutEnabled: value ? false : s.prioritySpineLayoutEnabled,
    })),
  setPrioritySpineLayoutEnabled: (value) =>
    set((s) => ({
      prioritySpineLayoutEnabled: value,
      priorityMealSlotLayoutEnabled: value ? false : s.priorityMealSlotLayoutEnabled,
    })),
  setPriorityMealSlotOverride: (categoryKey, mealSlot) =>
    set((s) => {
      const key = categoryKey.trim();
      if (!key) return s;
      const next = { ...s.priorityMealSlotOverrides };
      if (mealSlot) next[key] = mealSlot;
      else delete next[key];
      return { priorityMealSlotOverrides: next };
    }),
  mergePriorityMealSlotOverrides: (incoming) =>
    set((s) => {
      const next = { ...s.priorityMealSlotOverrides };
      let changed = false;
      for (const [rawKey, slot] of Object.entries(incoming)) {
        const key = rawKey.trim();
        const normalized = normalizeDayMealSlot(slot);
        if (!key || !normalized || next[key]) continue;
        next[key] = normalized;
        changed = true;
      }
      return changed ? { priorityMealSlotOverrides: next } : s;
    }),
  setPrioritySectionsMealSlots: (categoryKey, mealSlots) =>
    set((s) => {
      const key = categoryKey.trim();
      if (!key) return s;
      const next = { ...s.prioritySectionsMealSlots };
      if (mealSlots && mealSlots.length > 0) next[key] = [...new Set(mealSlots)];
      else delete next[key];
      return { prioritySectionsMealSlots: next };
    }),
  addPrioritySectionMealSlot: (categoryKey, mealSlot) =>
    set((s) => {
      const key = categoryKey.trim();
      const normalized = normalizeDayMealSlot(mealSlot);
      if (!key || !normalized) return s;
      const prev = s.prioritySectionsMealSlots[key] ?? [];
      if (prev.includes(normalized)) return s;
      return {
        prioritySectionsMealSlots: {
          ...s.prioritySectionsMealSlots,
          [key]: [...prev, normalized],
        },
      };
    }),
  /** 시간대 지정 시트 확인 — 항목별 구간을 전달값으로 교체 */
  mergePrioritySectionsMealSlots: (incoming) =>
    set((s) => {
      const next = { ...s.prioritySectionsMealSlots };
      let changed = false;
      for (const [rawKey, slots] of Object.entries(incoming)) {
        const key = rawKey.trim();
        if (!key) continue;
        const normalized = normalizeCategoryMealSlots(slots);
        if (normalized.length === 0) {
          if (key in next) {
            delete next[key];
            changed = true;
          }
          continue;
        }
        const prev = next[key] ?? [];
        if (prev.length === normalized.length && prev.every((slot, index) => slot === normalized[index])) {
          continue;
        }
        next[key] = normalized;
        changed = true;
      }
      return changed ? { prioritySectionsMealSlots: next } : s;
    }),
  migrateSectionCompletionOnSlotMove: (categoryKey, fromSlot, toSlot) =>
    set((s) => {
      const key = categoryKey.trim();
      if (!key || fromSlot === toSlot) return s;
      const fromCompletionKey = buildPrioritySectionCompletionKey(key, fromSlot);
      const toCompletionKey = buildPrioritySectionCompletionKey(key, toSlot);
      const completedFocusCategoryKeys = migrateCompletionKeyInList(
        s.completedFocusCategoryKeys,
        fromCompletionKey,
        toCompletionKey,
      );
      const planCompletionDismissedKeys = migrateCompletionKeyInList(
        s.planCompletionDismissedKeys,
        fromCompletionKey,
        toCompletionKey,
      );
      if (
        completedFocusCategoryKeys.length === s.completedFocusCategoryKeys.length &&
        planCompletionDismissedKeys.length === s.planCompletionDismissedKeys.length &&
        completedFocusCategoryKeys.every(
          (value, index) => value === s.completedFocusCategoryKeys[index],
        ) &&
        planCompletionDismissedKeys.every(
          (value, index) => value === s.planCompletionDismissedKeys[index],
        )
      ) {
        return s;
      }
      return { completedFocusCategoryKeys, planCompletionDismissedKeys };
    }),
}));

registerDraftSyncTodayTabAccessors(
  () => useDayPlanDraftStore.getState(),
  (patch) => useDayPlanDraftStore.setState(patch),
);

useDayPlanDraftStore.subscribe((state) => {
  if (!state.isHydrated) return;
  saveDayPlanDraft({
    planMode: state.planMode,
    isFocusStarted: state.isFocusStarted,
    completedFocusCategoryKeys: state.completedFocusCategoryKeys,
    planCompletionDismissedKeys: state.planCompletionDismissedKeys,
    priorityPlanDateKey: state.priorityPlanDateKey,
    priorityPlanDateKeyEnd: state.priorityPlanDateKeyEnd,
    priorityPlanExplicitMultiDay: state.priorityPlanExplicitMultiDay,
    priorityOvernightEndAuto: state.priorityOvernightEndAuto,
    priorityStart: state.priorityStart,
    priorityEnd: state.priorityEnd,
    priorityCategoryOrder: state.priorityCategoryOrder,
    priorityCategoryImportance: state.priorityCategoryImportance,
    routineHistoryPendingByDate: state.routineHistoryPendingByDate,
    routineHistoryPlannedKeysByDate: state.routineHistoryPlannedKeysByDate,
    quickMemoDraft: state.quickMemoDraft,
    priorityMealSlotLayoutEnabled: state.priorityMealSlotLayoutEnabled,
    prioritySpineLayoutEnabled: state.prioritySpineLayoutEnabled,
    priorityMealSlotOverrides: state.priorityMealSlotOverrides,
    prioritySectionsMealSlots: state.prioritySectionsMealSlots,
  });
  syncWidgetTimelineFromStorage();
});

function persistDayPlanDraft(): void {
  const s = useDayPlanDraftStore.getState();
  if (!s.isHydrated) return;
  saveDayPlanDraft({
    planMode: s.planMode,
    isFocusStarted: s.isFocusStarted,
    completedFocusCategoryKeys: s.completedFocusCategoryKeys,
    planCompletionDismissedKeys: s.planCompletionDismissedKeys,
    priorityPlanDateKey: s.priorityPlanDateKey,
    priorityPlanDateKeyEnd: s.priorityPlanDateKeyEnd,
    priorityPlanExplicitMultiDay: s.priorityPlanExplicitMultiDay,
    priorityOvernightEndAuto: s.priorityOvernightEndAuto,
    priorityStart: s.priorityStart,
    priorityEnd: s.priorityEnd,
    priorityCategoryOrder: s.priorityCategoryOrder,
    priorityCategoryImportance: s.priorityCategoryImportance,
    routineHistoryPendingByDate: s.routineHistoryPendingByDate,
    routineHistoryPlannedKeysByDate: s.routineHistoryPlannedKeysByDate,
    quickMemoDraft: s.quickMemoDraft,
    priorityMealSlotLayoutEnabled: s.priorityMealSlotLayoutEnabled,
    prioritySpineLayoutEnabled: s.prioritySpineLayoutEnabled,
    priorityMealSlotOverrides: s.priorityMealSlotOverrides,
    prioritySectionsMealSlots: s.prioritySectionsMealSlots,
  });
}

/** 목표 상세 설정 완료 시 오늘 우선순위 목록에 카테고리가 없으면 끝에 추가 */
export function appendPriorityCategoryKeysIfMissing(keys: string[]): void {
  const trimmed = keys.map((k) => k.trim()).filter(Boolean);
  if (trimmed.length === 0) return;
  const { priorityCategoryOrder, setPriorityCategoryOrder } = useDayPlanDraftStore.getState();
  const next = [...priorityCategoryOrder];
  let changed = false;
  for (const k of trimmed) {
    if (!next.includes(k)) {
      next.push(k);
      changed = true;
    }
  }
  if (changed) setPriorityCategoryOrder(next);
}
