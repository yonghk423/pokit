import {
  buildCategoryMealSlotOverrides,
  DAY_MEAL_SLOT_ORDER,
  getDayMealSlotLabel,
  getMealSlotStartHhmm,
  mealSlotProgressTowardNext,
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
  getDayMealSlotLabel,
  resolvePriorityMealSlot,
} from '@shared/lib/storage';

export type PriorityMealSlotSection<T extends { key: string }> = {
  slot: DayMealSlot;
  title: string;
  hintTime: string;
  items: T[];
  isCurrent: boolean;
  /** 현재 구간일 때 다음 구간까지의 진행률(0~1) */
  progressToNext?: number;
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
  const bucketKeysBySlot = new Map<DayMealSlot, Set<string>>(
    DAY_MEAL_SLOT_ORDER.map((slot) => [slot, new Set()]),
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
      const bucket = buckets.get(slot);
      const seenInSlot = bucketKeysBySlot.get(slot);
      if (!bucket || !seenInSlot || seenInSlot.has(item.key)) continue;
      seenInSlot.add(item.key);
      bucket.push(item);
    }
  });

  const currentSlot =
    typeof options?.nowMin === 'number'
      ? resolveCurrentMealSlotFromSchedule(options.nowMin, schedule)
      : null;

  const sections = DAY_MEAL_SLOT_ORDER.map((slot) => {
    const isCurrent = currentSlot === slot;
    return {
      slot,
      title: getDayMealSlotLabel(slot),
      hintTime: getMealSlotStartHhmm(schedule, slot),
      items: buckets.get(slot) ?? [],
      isCurrent,
      ...(isCurrent && typeof options?.nowMin === 'number'
        ? { progressToNext: mealSlotProgressTowardNext(options.nowMin, schedule, slot) }
        : {}),
    };
  }).filter((section) => includeEmptySections || section.items.length > 0);

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
  return DAY_MEAL_SLOT_ORDER.map((slot) => {
    const isCurrent = currentSlot === slot;
    return {
      slot,
      title: getDayMealSlotLabel(slot),
      hintTime: getMealSlotStartHhmm(schedule, slot),
      items: [],
      isCurrent,
      ...(isCurrent && typeof options?.nowMin === 'number'
        ? {
            progressToNext: mealSlotProgressTowardNext(
              options.nowMin,
              schedule,
              slot,
            ),
          }
        : {}),
    };
  });
}

function parseWindowMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 24 || min > 59) return null;
  const total = h * 60 + min;
  return total > 24 * 60 ? null : total;
}

function formatWindowMinutes(total: number): string {
  const t = Math.max(0, Math.min(total, 24 * 60));
  if (t === 24 * 60) return '24:00';
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 구간(시간대) 목록을 하루 시작~마무리 창에 맞춥니다. (오늘 탭 구간 보기 전용, 표시만 보정)
 * - 창 시작 시점에 활성인 구간을 맨 앞에 두고, 시작 시각을 하루 시작으로 맞춘다.
 * - 창 안 마지막 구간의 시작 시각은 하루 마무리로 맞춘다. (예: 끝 24:00 → 밤 24:00)
 * - 가운데 구간은 「시간대 변경」설정값을 유지한다.
 * - 창 밖 구간은 숨김. 단, 항목이 있는 구간은 데이터 유실 방지를 위해 뒤에 유지.
 */
export function clampMealSlotSectionsToWindow<
  T extends { slot: DayMealSlot; hintTime: string; items: readonly unknown[] },
>(sections: T[], priorityStart: string, priorityEnd: string, spansNextDay = false): T[] {
  if (sections.length === 0) return sections;
  const startMin = parseWindowMinutes(priorityStart);
  const endMinRaw = parseWindowMinutes(priorityEnd);
  if (startMin === null || endMinRaw === null) return sections;

  // 시각만으로는 자정 넘김을 알 수 없어 overnight(spansNextDay)를 함께 받는다.
  // 주의: 달력상 이틀(priorityPlanExplicitMultiDay)과 혼동하지 말 것 — 시계 창이
  // 자정을 넘길 때만 true여야 한다.
  const overnight = spansNextDay || endMinRaw <= startMin;
  const windowLen = !overnight
    ? endMinRaw - startMin
    : endMinRaw === startMin
      ? 24 * 60
      : endMinRaw + 24 * 60 - startMin;
  const endDisplayMin = overnight && endMinRaw === 0 ? 24 * 60 : endMinRaw;

  const mod = (n: number) => ((n % (24 * 60)) + 24 * 60) % (24 * 60);

  const withMinutes = sections
    .map((section) => {
      const start = parseWindowMinutes(section.hintTime);
      return start === null ? null : { section, start };
    })
    .filter((v): v is { section: T; start: number } => v !== null);
  if (withMinutes.length === 0) return sections;

  // 창 시작 직전(포함)에 가장 최근 시작한 구간이 창 시작 시점의 활성 구간
  let activeIdx = 0;
  let bestRot = Infinity;
  withMinutes.forEach(({ start }, i) => {
    const rot = mod(startMin - start);
    if (rot < bestRot) {
      bestRot = rot;
      activeIdx = i;
    }
  });

  const first = {
    ...withMinutes[activeIdx]!.section,
    hintTime: formatWindowMinutes(startMin),
  } as T;

  const rest = withMinutes
    .filter((_, i) => i !== activeIdx)
    .map((v) => ({ section: v.section, off: mod(v.start - startMin) }));

  // 같은 날: 하루 끝과 시작이 같은 구간(밤 24:00)도 마지막에 포함.
  // 자정 넘김: 끝 시각에 시작하는 다음 구간(예: 06:00 아침)은 제외.
  const inWindow = rest
    .filter((v) =>
      overnight ? v.off > 0 && v.off < windowLen : v.off > 0 && v.off <= windowLen,
    )
    .sort((a, b) => a.off - b.off)
    .map((v) => v.section);
  const outWithItems = rest
    .filter((v) => {
      const beyond = overnight ? v.off >= windowLen : v.off > windowLen;
      return beyond && v.section.items.length > 0;
    })
    .sort((a, b) => a.off - b.off)
    .map((v) => v.section);

  const windowSections: T[] = [first, ...inWindow];
  if (windowSections.length >= 2) {
    // 창 안 마지막 구간 = 하루 마무리 시각 (예: 24:00 → 밤 24:00)
    const lastIdx = windowSections.length - 1;
    windowSections[lastIdx] = {
      ...windowSections[lastIdx]!,
      hintTime: formatWindowMinutes(endDisplayMin),
    } as T;
  } else if (first.slot === 'night' && endDisplayMin === 24 * 60) {
    // 밤만 남는 창이고 하루가 자정에 끝나면 밤을 24:00으로 표시
    windowSections[0] = {
      ...first,
      hintTime: formatWindowMinutes(endDisplayMin),
    } as T;
  }

  return [...windowSections, ...outWithItems];
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
