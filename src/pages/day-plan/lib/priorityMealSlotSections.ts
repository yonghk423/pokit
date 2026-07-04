import {
  buildCategoryMealSlotOverrides,
  DAY_MEAL_SLOT_LABEL,
  DAY_MEAL_SLOT_ORDER,
  getMealSlotStartHhmm,
  normalizeDayMealSlotSchedule,
  resolveCurrentMealSlotFromSchedule,
  resolveDefaultMealSlotForCategory,
  resolveExplicitCategoryMealSlots,
  resolvePriorityMealSlot,
  type CategoryMealSlotOverride,
  type DayMealSlot,
  type DayMealSlotSchedule,
} from '@shared/lib/storage';

export type { DayMealSlot, DayMealSlotSchedule };
export {
  DAY_MEAL_SLOT_LABEL,
  DAY_MEAL_SLOT_ORDER,
  resolvePriorityMealSlot,
};

export type PriorityMealSlotSection<T extends { key: string }> = {
  slot: DayMealSlot;
  title: string;
  hintTime: string;
  items: T[];
  isCurrent: boolean;
};

export type PriorityMealSlotSectionsResult<T extends { key: string }> = {
  sections: PriorityMealSlotSection<T>[];
  unslottedItems: T[];
};

export type MealSlotSectionEntry = {
  slot: DayMealSlot;
  key: string;
};

function buildPriorityMealSlotSectionBuckets<T extends { key: string }>(
  items: T[],
  options?: {
    nowMin?: number;
    mealSlotOverrides?: ReadonlyMap<string, CategoryMealSlotOverride>;
    schedule?: DayMealSlotSchedule;
    orderIndexByKey?: ReadonlyMap<string, number>;
    /** true면 mealSlotOverrides에 있는 항목만 구간에 넣고, 나머지는 unslotted */
    explicitSlotsOnly?: boolean;
    /** true면 항목이 없는 구간도 섹션 목록에 포함 */
    includeEmptySections?: boolean;
  },
): PriorityMealSlotSectionsResult<T> {
  const overrides = options?.mealSlotOverrides ?? new Map<string, CategoryMealSlotOverride>();
  const explicitSlotsOnly = options?.explicitSlotsOnly === true;
  const includeEmptySections = options?.includeEmptySections === true;
  const schedule = normalizeDayMealSlotSchedule(options?.schedule);
  const buckets = new Map<DayMealSlot, T[]>(
    DAY_MEAL_SLOT_ORDER.map((slot) => [slot, []]),
  );
  const unslottedItems: T[] = [];

  items.forEach((item, displayIndex) => {
    const explicitSlots = resolveExplicitCategoryMealSlots(overrides, item.key);
    if (explicitSlotsOnly && !explicitSlots) {
      unslottedItems.push(item);
      return;
    }
    const orderIndex = options?.orderIndexByKey?.get(item.key) ?? displayIndex;
    const slots =
      explicitSlots ?? [resolvePriorityMealSlot(item.key, orderIndex, overrides as ReadonlyMap<string, DayMealSlot>)];
    for (const slot of slots) {
      buckets.get(slot)?.push(item);
    }
  });

  const currentSlot =
    typeof options?.nowMin === 'number'
      ? resolveCurrentMealSlotFromSchedule(options.nowMin, schedule)
      : null;

  const sections = DAY_MEAL_SLOT_ORDER.map((slot) => ({
    slot,
    title: DAY_MEAL_SLOT_LABEL[slot],
    hintTime: getMealSlotStartHhmm(schedule, slot),
    items: buckets.get(slot) ?? [],
    isCurrent: currentSlot === slot,
  })).filter((section) => includeEmptySections || section.items.length > 0);

  return { sections, unslottedItems };
}

export function splitPriorityMealSlotSections<T extends { key: string }>(
  items: T[],
  options?: {
    nowMin?: number;
    mealSlotOverrides?: ReadonlyMap<string, CategoryMealSlotOverride>;
    schedule?: DayMealSlotSchedule;
    orderIndexByKey?: ReadonlyMap<string, number>;
    explicitSlotsOnly?: boolean;
    includeEmptySections?: boolean;
  },
): PriorityMealSlotSectionsResult<T> {
  return buildPriorityMealSlotSectionBuckets(items, options);
}

export function buildPriorityMealSlotSections<T extends { key: string }>(
  items: T[],
  options?: {
    nowMin?: number;
    mealSlotOverrides?: ReadonlyMap<string, CategoryMealSlotOverride>;
    schedule?: DayMealSlotSchedule;
    /** 담기 순서 인덱스 — 완료로 표시 순서가 바뀌어도 구간 분류는 유지 */
    orderIndexByKey?: ReadonlyMap<string, number>;
  },
): PriorityMealSlotSection<T>[] {
  return buildPriorityMealSlotSectionBuckets(items, options).sections;
}

export function hasExplicitMealSlotAssignments(
  items: readonly { key: string }[],
  overrides: ReadonlyMap<string, CategoryMealSlotOverride>,
): boolean {
  return items.some((item) => resolveExplicitCategoryMealSlots(overrides, item.key) != null);
}

/** 구간(시간대)을 아직 지정하지 않은 담기 항목 */
export function listUnslottedPriorityItems<T extends { key: string }>(
  items: readonly T[],
  overrides: ReadonlyMap<string, CategoryMealSlotOverride>,
): T[] {
  return items.filter((item) => resolveExplicitCategoryMealSlots(overrides, item.key) == null);
}

/**
 * 시간대 지정 시트에 표시할 담기 항목.
 * 일부만 구간이 지정된 상태(새 항목 추가 직후 등)면 전체 목록을 보여 재지정·누락 방지.
 */
export function listPriorityItemsForMealSlotAssignmentSheet<T extends { key: string }>(
  items: readonly T[],
  overrides: ReadonlyMap<string, CategoryMealSlotOverride>,
): T[] {
  if (items.length === 0) return [];
  const slottedCount = items.filter(
    (item) => resolveExplicitCategoryMealSlots(overrides, item.key) != null,
  ).length;
  if (slottedCount > 0 && slottedCount < items.length) {
    return [...items];
  }
  return listUnslottedPriorityItems(items, overrides);
}

/** 고정 루틴·수동 지정이 없는 담기 항목에 카테고리 기본 구간을 채웁니다. */
export function buildDefaultPriorityMealSlotOverrides(
  items: readonly { key: string }[],
  options?: {
    orderIndexByKey?: ReadonlyMap<string, number>;
    existingOverrides?: ReadonlyMap<string, DayMealSlot>;
  },
): Record<string, DayMealSlot> {
  const existing = options?.existingOverrides ?? new Map<string, DayMealSlot>();
  const out: Record<string, DayMealSlot> = {};
  items.forEach((item, displayIndex) => {
    if (existing.has(item.key)) return;
    const orderIndex = options?.orderIndexByKey?.get(item.key) ?? displayIndex;
    out[item.key] = resolveDefaultMealSlotForCategory(item.key, orderIndex);
  });
  return out;
}

/** 담기 항목이 없을 때 시간대별 보기 구간 뼈대 */
export function buildEmptyPriorityMealSlotSections<T extends { key: string }>(
  options?: {
    nowMin?: number;
    schedule?: DayMealSlotSchedule;
  },
): PriorityMealSlotSection<T>[] {
  const schedule = normalizeDayMealSlotSchedule(options?.schedule);
  const currentSlot =
    typeof options?.nowMin === 'number'
      ? resolveCurrentMealSlotFromSchedule(options.nowMin, schedule)
      : null;
  return DAY_MEAL_SLOT_ORDER.map((slot) => ({
    slot,
    title: DAY_MEAL_SLOT_LABEL[slot],
    hintTime: getMealSlotStartHhmm(schedule, slot),
    items: [],
    isCurrent: currentSlot === slot,
  }));
}

export function flattenPriorityMealSlotSectionKeys<T extends { key: string }>(
  sections: PriorityMealSlotSection<T>[],
): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.key));
}

export function flattenPriorityMealSlotSectionEntries<T extends { key: string }>(
  sections: PriorityMealSlotSection<T>[],
): MealSlotSectionEntry[] {
  return sections.flatMap((section) =>
    section.items.map((item) => ({ slot: section.slot, key: item.key })),
  );
}

export function inferMealSlotAfterEntryReorder(
  entries: readonly MealSlotSectionEntry[],
  toIndex: number,
  fallbackSlot: DayMealSlot,
): DayMealSlot {
  const neighborAfter = entries[toIndex + 1];
  const neighborBefore = entries[toIndex - 1];
  if (neighborAfter) return neighborAfter.slot;
  if (neighborBefore) return neighborBefore.slot;
  return fallbackSlot;
}

export function reorderMealSlotSectionEntries(
  entries: readonly MealSlotSectionEntry[],
  from: number,
  to: number,
): MealSlotSectionEntry[] {
  if (from === to || from < 0 || to < 0 || from >= entries.length || to >= entries.length) {
    return [...entries];
  }
  const next = [...entries];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function reorderFlatKeys(keys: readonly string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= keys.length || to >= keys.length) {
    return [...keys];
  }
  const next = [...keys];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** 구간 레이아웃에서 flat 재정렬 후 이동 항목이 속할 시간대 추론 */
export function inferMealSlotAfterFlatReorder(
  keys: readonly string[],
  movedKey: string,
  toIndex: number,
  slotOfKey: (key: string) => DayMealSlot,
): DayMealSlot {
  const neighborAfter = keys[toIndex + 1];
  const neighborBefore = keys[toIndex - 1];
  if (neighborAfter && neighborAfter !== movedKey) return slotOfKey(neighborAfter);
  if (neighborBefore && neighborBefore !== movedKey) return slotOfKey(neighborBefore);
  return slotOfKey(movedKey);
}

export { buildCategoryMealSlotOverrides };
