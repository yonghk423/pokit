import {
  getMealSlotStartHhmm,
  normalizeCategoryMealSlots,
  normalizeDayMealSlotSchedule,
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
};

export type RoutineStartNotifyPlanBlock = {
  categoryKey?: string;
  startMinutes?: number;
};

function minutesToNotifyHhmm(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes >= 24 * 60) return null;
  return formatMinutesToHHmm(minutes);
}

function pushUnique(
  out: RoutineStartNotifySlot[],
  seen: Set<string>,
  categoryKey: string,
  hhmm: string,
): void {
  const normalized = hhmm.trim();
  const m = parseHHmmToMinutes(normalized);
  if (m === null || m >= 24 * 60) return;
  const slotKey = `${categoryKey}:${normalized}`;
  if (seen.has(slotKey)) return;
  seen.add(slotKey);
  out.push({ categoryKey, hhmm: normalized, slotKey });
}

function pushMealSlots(
  out: RoutineStartNotifySlot[],
  seen: Set<string>,
  categoryKey: string,
  slots: readonly DayMealSlot[],
  schedule: DayMealSlotSchedule,
): void {
  for (const slot of slots) {
    pushUnique(out, seen, categoryKey, getMealSlotStartHhmm(schedule, slot));
  }
}

/**
 * 카테고리별「시작 알림」시각을 모읍니다.
 * - 고정 루틴 항목의 타임라인 시작 / 배정 시간대 (활성 세트 우선, 없으면 전체)
 * - 오늘 일정 블록 시작 시각
 * - 오늘 탭 시간대 배정
 */
export function collectRoutineStartNotifySlots(input: {
  enabledCategoryKeys: readonly string[];
  sets: readonly FixedFlowSet[];
  activeSetIds: readonly string[];
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
  const out: RoutineStartNotifySlot[] = [];
  const seen = new Set<string>();

  // 1) 고정 루틴 — 활성 세트 먼저, 이어서 나머지
  const orderedSets = [
    ...input.sets.filter((set) => activeIds.has(set.id)),
    ...input.sets.filter((set) => !activeIds.has(set.id)),
  ];
  for (const set of orderedSets) {
    for (const item of set.items) {
      if (item.enabled === false) continue;
      if (!enabled.has(item.categoryKey)) continue;

      if (typeof item.spineStartMinutes === 'number') {
        const hhmm = minutesToNotifyHhmm(item.spineStartMinutes);
        if (hhmm) pushUnique(out, seen, item.categoryKey, hhmm);
      }

      const mealSlots = normalizeCategoryMealSlots(
        item.mealSlots !== undefined ? item.mealSlots : item.mealSlot,
      );
      if (mealSlots.length > 0) {
        pushMealSlots(out, seen, item.categoryKey, mealSlots, schedule);
      }
    }
  }

  // 2) 오늘 탭 시간대 배정
  if (input.sectionsMealSlots) {
    for (const categoryKey of enabled) {
      const slots = normalizeCategoryMealSlots(input.sectionsMealSlots[categoryKey]);
      if (slots.length > 0) {
        pushMealSlots(out, seen, categoryKey, slots, schedule);
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
      if (hhmm) pushUnique(out, seen, key, hhmm);
    }
  }

  return out;
}

/** 해당 카테고리에 예약 가능한 시작 시각이 하나라도 있는지 */
export function hasResolvableRoutineStartTime(input: {
  categoryKey: string;
  sets: readonly FixedFlowSet[];
  activeSetIds: readonly string[];
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
      layoutMode: input.layoutMode,
      mealSchedule: input.mealSchedule,
      planBlocks: input.planBlocks,
      sectionsMealSlots: input.sectionsMealSlots,
    }).length > 0
  );
}
