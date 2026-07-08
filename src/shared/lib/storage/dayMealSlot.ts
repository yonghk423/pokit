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
  fasting: 'dawn',
  water: 'morning',
  medicine: 'morning',
  reading: 'morning',
  work: 'lunch',
};

export function normalizeDayMealSlot(raw: unknown): DayMealSlot | null {
  if (typeof raw !== 'string') return null;
  const next = raw.trim() as DayMealSlot;
  return VALID_MEAL_SLOTS.has(next) ? next : null;
}

/** 카테고리별 시간대 — 단일 값(레거시) 또는 배열 */
export type CategoryMealSlotOverride = DayMealSlot | DayMealSlot[];

export function normalizeCategoryMealSlots(raw: unknown): DayMealSlot[] {
  if (Array.isArray(raw)) {
    const out: DayMealSlot[] = [];
    for (const item of raw) {
      const slot = normalizeDayMealSlot(item);
      if (slot && !out.includes(slot)) out.push(slot);
    }
    return out;
  }
  const single = normalizeDayMealSlot(raw);
  return single ? [single] : [];
}

export function resolveExplicitCategoryMealSlots(
  overrides: ReadonlyMap<string, CategoryMealSlotOverride>,
  key: string,
): DayMealSlot[] | null {
  if (!overrides.has(key)) return null;
  const slots = normalizeCategoryMealSlots(overrides.get(key));
  return slots.length > 0 ? slots : null;
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

function resolveActiveMealSlotFilter(
  activeMealSlotsBySetId: Record<string, DayMealSlot[]> | undefined,
  setId: string,
): Set<DayMealSlot> | null {
  const activeSlotsRaw = activeMealSlotsBySetId?.[setId];
  if (!Array.isArray(activeSlotsRaw) || activeSlotsRaw.length === 0) return null;
  return new Set(activeSlotsRaw);
}

/** 오늘 적용 중인 고정 루틴 항목의 구간 — 저장 mealSlot 없으면 카테고리 기본값 */
export function buildAppliedFixedRoutineMealSlotOverrides(
  state: Pick<FixedFlowSetsState, 'sets' | 'activeSetIds' | 'activeMealSlotsBySetId'>,
  appliedKeys: readonly string[],
): Record<string, DayMealSlot> {
  const activeSetIds = new Set(state.activeSetIds);
  const appliedKeySet = new Set(appliedKeys);
  const activeMealSlotsBySetId = state.activeMealSlotsBySetId ?? {};
  const out: Record<string, DayMealSlot> = {};

  for (const set of state.sets) {
    if (!activeSetIds.has(set.id)) continue;
    const activeSlots = resolveActiveMealSlotFilter(activeMealSlotsBySetId, set.id);
    for (const [index, item] of set.items.entries()) {
      if (item.enabled === false) continue;
      const key = item.categoryKey.trim();
      if (!key || !appliedKeySet.has(key)) continue;
      const slot = resolveFixedFlowItemMealSlot(item, index);
      if (activeSlots && !activeSlots.has(slot)) continue;
      if (!out[key]) out[key] = slot;
    }
  }

  return out;
}

export function buildCategoryMealSlotOverrides(
  state: Pick<FixedFlowSetsState, 'sets' | 'activeSetIds' | 'activeMealSlotsBySetId'> & {
    todayAppliedCategoryKeys?: string[];
  },
): Map<string, DayMealSlot> {
  const appliedKeys = state.todayAppliedCategoryKeys;
  if (Array.isArray(appliedKeys)) {
    const record = buildAppliedFixedRoutineMealSlotOverrides(state, appliedKeys);
    return new Map(Object.entries(record));
  }

  const activeSetIds = new Set(state.activeSetIds);
  const activeMealSlotsBySetId = state.activeMealSlotsBySetId ?? {};
  const map = new Map<string, DayMealSlot>();
  for (const set of state.sets) {
    if (!activeSetIds.has(set.id)) continue;
    const activeSlots = resolveActiveMealSlotFilter(activeMealSlotsBySetId, set.id);
    for (const [index, item] of set.items.entries()) {
      if (item.enabled === false) continue;
      const slot = resolveFixedFlowItemMealSlot(item, index);
      if (activeSlots && !activeSlots.has(slot)) continue;
      map.set(item.categoryKey, slot);
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

/** 고정 루틴 편집 — 항목이 있는 구간 + 사용자가 연 빈 구간 */
export function buildFixedFlowMealSlotSections<
  T extends Pick<FixedFlowSetItem, 'categoryKey' | 'mealSlot'>,
>(
  items: T[],
  schedule: DayMealSlotSchedule = DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
  pinnedSlots: readonly DayMealSlot[] = [],
): { slot: DayMealSlot; title: string; hintTime: string; items: T[] }[] {
  const grouped = groupFixedFlowItemsByMealSlot(items, schedule);
  const bySlot = new Map(grouped.map((section) => [section.slot, section]));
  const visibleSlots = new Set<DayMealSlot>([
    ...grouped.map((section) => section.slot),
    ...pinnedSlots,
  ]);
  const normalizedSchedule = normalizeDayMealSlotSchedule(schedule);
  return DAY_MEAL_SLOT_ORDER.filter((slot) => visibleSlots.has(slot)).map((slot) =>
    bySlot.get(slot) ?? {
      slot,
      title: DAY_MEAL_SLOT_LABEL[slot],
      hintTime: getMealSlotStartHhmm(normalizedSchedule, slot),
      items: [],
    },
  );
}

/** @deprecated schedule 인자 사용 권장 — `resolveCurrentMealSlotFromSchedule` */
export function resolveCurrentMealSlot(
  nowMin: number,
  schedule: DayMealSlotSchedule = DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
): DayMealSlot {
  return resolveCurrentMealSlotFromSchedule(nowMin, schedule);
}
