import {
  getMealSlotStartHhmm,
  normalizeCategoryMealSlots,
  normalizeDayMealSlotSchedule,
  resolveApplyWeekdays,
  WEEKDAY_PRESET_DAILY,
  type WeekdayIndex,
  type DayMealSlot,
  type DayMealSlotSchedule,
  type FixedFlowSet,
  type FixedRoutineApplyLayoutMode,
} from '@shared/lib/storage';

import { formatMinutesToHHmm } from './dayPlanTimeMath';
import { parseHHmmToMinutes } from './parseTime';

export type RoutineStartNotifySlot = {
  categoryKey: string;
  hhmm: string;
  /** `${categoryKey}:${hhmm}` */
  slotKey: string;
  /** JS Date#getDay 기준 요일(0=일~6=토) */
  weekdays: WeekdayIndex[];
};

export type RoutineStartNotifyPlanBlock = {
  categoryKey?: string;
  startMinutes?: number;
};

function minutesToNotifyHhmm(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes >= 24 * 60) return null;
  return formatMinutesToHHmm(minutes);
}

function normalizeWeekdaysOrDaily(weekdays?: readonly WeekdayIndex[]): WeekdayIndex[] {
  const source = weekdays ?? WEEKDAY_PRESET_DAILY;
  const normalized = [...new Set(source)].filter(
    (d): d is WeekdayIndex => Number.isInteger(d) && d >= 0 && d <= 6,
  );
  if (normalized.length === 0) return [...WEEKDAY_PRESET_DAILY];
  return [...normalized].sort((a, b) => a - b);
}

function pushUnique(
  out: Map<string, RoutineStartNotifySlot>,
  categoryKey: string,
  hhmm: string,
  weekdays?: readonly WeekdayIndex[],
): void {
  const normalized = hhmm.trim();
  const m = parseHHmmToMinutes(normalized);
  if (m === null || m >= 24 * 60) return;
  const slotKey = `${categoryKey}:${normalized}`;
  const nextWeekdays = normalizeWeekdaysOrDaily(weekdays);
  const prev = out.get(slotKey);
  if (!prev) {
    out.set(slotKey, { categoryKey, hhmm: normalized, slotKey, weekdays: nextWeekdays });
    return;
  }
  const merged = [...new Set([...prev.weekdays, ...nextWeekdays])].sort((a, b) => a - b);
  out.set(slotKey, { ...prev, weekdays: merged });
}

function pushMealSlots(
  out: Map<string, RoutineStartNotifySlot>,
  categoryKey: string,
  slots: readonly DayMealSlot[],
  schedule: DayMealSlotSchedule,
  weekdays?: readonly WeekdayIndex[],
): void {
  for (const slot of slots) {
    pushUnique(out, categoryKey, getMealSlotStartHhmm(schedule, slot), weekdays);
  }
}

/**
 * 카테고리별「시작 알림」시각을 모읍니다.
 * - 고정 루틴 항목의 타임라인 시작 / 배정 시간대 (+ 요일 규칙)
 * - 오늘 일정 블록 시작 시각
 * - 오늘 탭 시간대 배정
 */
export function collectRoutineStartNotifySlots(input: {
  enabledCategoryKeys: readonly string[];
  sets: readonly FixedFlowSet[];
  activeSetIds: readonly string[];
  /** false면 활성 세트만 반영 (실제 예약 생성용) */
  includeInactiveSets?: boolean;
  /** @deprecated 해석에 더 이상 필수로 쓰지 않음(호환용) */
  layoutMode?: FixedRoutineApplyLayoutMode;
  mealSchedule: DayMealSlotSchedule;
  planBlocks?: readonly RoutineStartNotifyPlanBlock[];
  sectionsMealSlots?: Record<string, DayMealSlot[] | DayMealSlot | undefined>;
}): RoutineStartNotifySlot[] {
  const enabled = new Set(input.enabledCategoryKeys.filter(Boolean));
  if (enabled.size === 0) return [];

  const schedule = normalizeDayMealSlotSchedule(input.mealSchedule);
  const activeIds = new Set(input.activeSetIds);
  const slotMap = new Map<string, RoutineStartNotifySlot>();
  const includeInactiveSets = input.includeInactiveSets !== false;

  // 1) 고정 루틴 — 활성 세트 우선, 필요 시 비활성 세트도 참고
  const orderedSets = includeInactiveSets
    ? [
        ...input.sets.filter((set) => activeIds.has(set.id)),
        ...input.sets.filter((set) => !activeIds.has(set.id)),
      ]
    : input.sets.filter((set) => activeIds.has(set.id));
  for (const set of orderedSets) {
    const weekdays = resolveApplyWeekdays({
      applyRule: set.applyRule,
      applyWeekdays: set.applyWeekdays,
    });
    for (const item of set.items) {
      if (item.enabled === false) continue;
      if (!enabled.has(item.categoryKey)) continue;

      if (typeof item.spineStartMinutes === 'number') {
        const hhmm = minutesToNotifyHhmm(item.spineStartMinutes);
        if (hhmm) pushUnique(slotMap, item.categoryKey, hhmm, weekdays);
      }

      const mealSlots = normalizeCategoryMealSlots(
        item.mealSlots !== undefined ? item.mealSlots : item.mealSlot,
      );
      if (mealSlots.length > 0) {
        pushMealSlots(slotMap, item.categoryKey, mealSlots, schedule, weekdays);
      }
    }
  }

  // 2) 오늘 탭 시간대 배정
  if (input.sectionsMealSlots) {
    for (const categoryKey of enabled) {
      const slots = normalizeCategoryMealSlots(input.sectionsMealSlots[categoryKey]);
      if (slots.length > 0) {
        pushMealSlots(slotMap, categoryKey, slots, schedule, WEEKDAY_PRESET_DAILY);
      }
    }
  }

  // 3) 오늘 일정 블록 시작 시각
  if (input.planBlocks) {
    for (const block of input.planBlocks) {
      const key = typeof block.categoryKey === 'string' ? block.categoryKey : '';
      if (!key || !enabled.has(key)) continue;
      if (typeof block.startMinutes !== 'number') continue;
      const hhmm = minutesToNotifyHhmm(block.startMinutes);
      if (hhmm) pushUnique(slotMap, key, hhmm, WEEKDAY_PRESET_DAILY);
    }
  }

  return [...slotMap.values()];
}

/** 해당 카테고리에 예약 가능한 시작 시각이 하나라도 있는지 */
export function hasResolvableRoutineStartTime(input: {
  categoryKey: string;
  sets: readonly FixedFlowSet[];
  activeSetIds: readonly string[];
  includeInactiveSets?: boolean;
  layoutMode?: FixedRoutineApplyLayoutMode;
  mealSchedule: DayMealSlotSchedule;
  planBlocks?: readonly RoutineStartNotifyPlanBlock[];
  sectionsMealSlots?: Record<string, DayMealSlot[] | DayMealSlot | undefined>;
}): boolean {
  return (
    collectRoutineStartNotifySlots({
      enabledCategoryKeys: [input.categoryKey],
      sets: input.sets,
      activeSetIds: input.activeSetIds,
      includeInactiveSets: input.includeInactiveSets,
      layoutMode: input.layoutMode,
      mealSchedule: input.mealSchedule,
      planBlocks: input.planBlocks,
      sectionsMealSlots: input.sectionsMealSlots,
    }).length > 0
  );
}
