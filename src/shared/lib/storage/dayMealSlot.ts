import type { FixedFlowSetItem, FixedFlowSetsState } from './fixedFlowSetsStorage';
import {
  DAY_MEAL_SLOT_ORDER,
  DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
  getMealSlotStartHhmm,
  normalizeDayMealSlotSchedule,
  resolveCurrentMealSlotFromSchedule,
  type DayMealSlot,
  type DayMealSlotSchedule,
} from './dayMealSlotScheduleStorage';

export type { DayMealSlot, DayMealSlotSchedule };
export {
  DAY_MEAL_SLOT_ORDER,
  DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
  getMealSlotStartHhmm,
  isDayMealSlotScheduleValid,
  loadDayMealSlotSchedule,
  normalizeDayMealSlotSchedule,
  resolveCurrentMealSlotFromSchedule,
  saveDayMealSlotSchedule,
} from './dayMealSlotScheduleStorage';

export const DAY_MEAL_SLOT_LABEL: Record<DayMealSlot, string> = {
  dawn: '새벽',
  morning: '아침',
  lunch: '점심',
  dinner: '저녁',
  night: '밤',
};

export const DAY_MEAL_SLOT_HINT: Record<DayMealSlot, string> = {
  dawn: '04:00',
  morning: '06:00',
  lunch: '12:30',
  dinner: '19:00',
  night: '21:00',
};

const VALID_MEAL_SLOTS = new Set<string>(DAY_MEAL_SLOT_ORDER);

const DEFAULT_SLOT_BY_CATEGORY: Partial<Record<string, DayMealSlot>> = {
  meditation: 'dawn',
  breathing: 'dawn',
  fasting: 'dawn',
  water: 'morning',
  medicine: 'morning',
  reading: 'morning',
  planning: 'morning',
  skincare: 'morning',
  vitamins: 'morning',
  deepwork: 'lunch',
  work: 'lunch',
  study: 'lunch',
  writing: 'lunch',
  language: 'lunch',
  creative: 'lunch',
  inbox: 'lunch',
  pomodoro: 'lunch',
  coding: 'lunch',
  organize: 'lunch',
  news: 'lunch',
  review: 'lunch',
  stretching: 'dinner',
  straightenBack: 'dinner',
  neckPosture: 'dinner',
  workout: 'dinner',
  walking: 'dinner',
  yoga: 'dinner',
  posture: 'dinner',
  eyerest: 'dinner',
  sleep: 'night',
  journal: 'night',
  podcast: 'night',
};

export function normalizeDayMealSlot(raw: unknown): DayMealSlot | null {
  if (typeof raw !== 'string') return null;
  const next = raw.trim() as DayMealSlot;
  return VALID_MEAL_SLOTS.has(next) ? next : null;
}

/** 카테고리 기본 구간 — 저장된 mealSlot이 없을 때 */
export function resolveDefaultMealSlotForCategory(
  categoryKey: string,
  orderIndex: number,
): DayMealSlot {
  const mapped = DEFAULT_SLOT_BY_CATEGORY[categoryKey];
  if (mapped) return mapped;
  return DAY_MEAL_SLOT_ORDER[orderIndex % DAY_MEAL_SLOT_ORDER.length] ?? 'morning';
}

/** 고정 루틴 항목에 저장된 구간 또는 카테고리 기본값 */
export function resolveFixedFlowItemMealSlot(
  item: Pick<FixedFlowSetItem, 'categoryKey' | 'mealSlot'>,
  orderIndex: number,
): DayMealSlot {
  const stored = normalizeDayMealSlot(item.mealSlot);
  if (stored) return stored;
  return resolveDefaultMealSlotForCategory(item.categoryKey, orderIndex);
}

/** 담기 목록 표시 — 사용자 지정 구간 우선 */
export function resolvePriorityMealSlot(
  categoryKey: string,
  orderIndex: number,
  overrides?: ReadonlyMap<string, DayMealSlot>,
): DayMealSlot {
  const fromOverride = overrides?.get(categoryKey);
  if (fromOverride) return fromOverride;
  return resolveDefaultMealSlotForCategory(categoryKey, orderIndex);
}

export function buildCategoryMealSlotOverrides(
  state: Pick<FixedFlowSetsState, 'sets'>,
): Map<string, DayMealSlot> {
  const map = new Map<string, DayMealSlot>();
  for (const set of state.sets) {
    for (const item of set.items) {
      const slot = normalizeDayMealSlot(item.mealSlot);
      if (slot) map.set(item.categoryKey, slot);
    }
  }
  return map;
}

export function groupFixedFlowItemsByMealSlot<T extends Pick<FixedFlowSetItem, 'categoryKey' | 'mealSlot'>>(
  items: T[],
  schedule: DayMealSlotSchedule = DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
): { slot: DayMealSlot; title: string; hintTime: string; items: T[] }[] {
  const normalizedSchedule = normalizeDayMealSlotSchedule(schedule);
  const buckets = new Map<DayMealSlot, T[]>(
    DAY_MEAL_SLOT_ORDER.map((slot) => [slot, []]),
  );

  items.forEach((item, index) => {
    const slot = resolveFixedFlowItemMealSlot(item, index);
    buckets.get(slot)?.push(item);
  });

  return DAY_MEAL_SLOT_ORDER.map((slot) => ({
    slot,
    title: DAY_MEAL_SLOT_LABEL[slot],
    hintTime: getMealSlotStartHhmm(normalizedSchedule, slot),
    items: buckets.get(slot) ?? [],
  })).filter((section) => section.items.length > 0);
}

/** @deprecated schedule 인자 사용 권장 — `resolveCurrentMealSlotFromSchedule` */
export function resolveCurrentMealSlot(
  nowMin: number,
  schedule: DayMealSlotSchedule = DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
): DayMealSlot {
  return resolveCurrentMealSlotFromSchedule(nowMin, schedule);
}
