import {
  buildAppliedFixedRoutineMealSlotsMap,
  isBuiltinPresetScheduleSet,
  resolveFixedFlowItemMealSlot,
  resolveFixedFlowItemMealSlots,
  type DayMealSlot,
  type FixedFlowSet,
  type FixedFlowSetItem,
  type FixedRoutineApplyLayoutMode,
} from '@shared/lib/storage';

import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { filterSpineTimelineBlocks, isDayPlanSpineTimelineBlock } from './dayPlanFlowBlock';
import { resolveFixedFlowSpineSchedules } from './fixedFlowSpineSchedule';
import { sortDayPlanBlocks } from './dayPlanTime';
import { filterKeysToPriorityCatalog, sanitizePriorityCategoryOrderKeys } from './priorityCatalogRegistry';
import {
  looksLikeRawCategoryKeyTitle,
  resolveCategoryKeyDisplayLabelKo,
} from './resolveDayPlanBlockDisplayTitle';
import type { DayPlanBlock } from '../model/types';

/** 고정·나만의 루틴 세트에 등록된 활성 categoryKey */
export function collectAllFixedFlowCategoryKeys(sets: FixedFlowSet[]): Set<string> {
  const out = new Set<string>();
  for (const set of sets) {
    for (const item of set.items) {
      if (item.enabled === false) continue;
      const key = item.categoryKey.trim();
      if (key) out.add(key);
    }
  }
  return out;
}

/**
 * 오늘 탭 담기 순서를 고정 루틴 적용 상태와 맞춘다.
 * - 오늘 적용 중이 아닌 고정 루틴 항목은 제거 (단, 루틴 탭에서 직접 고른 항목은 유지)
 */
export function syncPriorityOrderWithAppliedFixedRoutines(
  order: string[],
  appliedKeys: string[],
  allFixedFlowKeys: Set<string>,
  routineCatalogSelectionKeys: ReadonlySet<string> = new Set(),
): string[] {
  const applied = new Set(appliedKeys);
  return order.filter((key) => {
    if (!allFixedFlowKeys.has(key)) return true;
    if (applied.has(key)) return true;
    if (routineCatalogSelectionKeys.has(key)) return true;
    return false;
  });
}

/** 적용 중인 고정 루틴 키를 담기 순서 끝에 합친다. */
export function mergeOrderWithAppliedFixedRoutines(
  order: string[],
  appliedKeys: string[],
  allFixedFlowKeys: Set<string>,
  routineCatalogSelectionKeys: ReadonlySet<string> = new Set(),
): string[] {
  const filtered = syncPriorityOrderWithAppliedFixedRoutines(
    order,
    appliedKeys,
    allFixedFlowKeys,
    routineCatalogSelectionKeys,
  );
  const existing = new Set(filtered);
  const toAppend = appliedKeys.filter((key) => !existing.has(key));
  return sanitizePriorityCategoryOrderKeys([...filtered, ...toAppend]);
}

function pruneMealSlotOverrides(
  overrides: Record<string, DayMealSlot>,
  appliedKeys: Set<string>,
  allFixedFlowKeys: Set<string>,
  routineCatalogSelectionKeys: ReadonlySet<string> = new Set<string>(),
): Record<string, DayMealSlot> {
  const next = { ...overrides };
  for (const key of allFixedFlowKeys) {
    if (appliedKeys.has(key)) continue;
    if (routineCatalogSelectionKeys.has(key)) continue;
    delete next[key];
  }
  return next;
}

/** 적용된 customFlow가 있으면 같은 세트·같은 구간의 표준 카탈로그 키는 order에서 제외 */
export function collectStandardsSupersededByAppliedCustom(
  sets: FixedFlowSet[],
  activeSetIds: readonly string[],
  activeMealSlotsBySetId: Record<string, DayMealSlot[]> | undefined,
  appliedKeys: readonly string[],
): Set<string> {
  const active = new Set(activeSetIds);
  const applied = new Set(appliedKeys);
  const superseded = new Set<string>();

  for (const set of sets) {
    if (!active.has(set.id)) continue;
    const activeSlotsRaw = activeMealSlotsBySetId?.[set.id];
    const activeSlots =
      Array.isArray(activeSlotsRaw) && activeSlotsRaw.length > 0 ? new Set(activeSlotsRaw) : null;

    const appliedCustomBySlot = new Map<DayMealSlot, string>();
    for (const [index, item] of set.items.entries()) {
      if (item.enabled === false) continue;
      const key = item.categoryKey.trim();
      if (!key || !applied.has(key) || !isCustomFlowCategoryKey(key)) continue;
      for (const slot of resolveFixedFlowItemMealSlots(item, index)) {
        if (activeSlots && !activeSlots.has(slot)) continue;
        if (!appliedCustomBySlot.has(slot)) appliedCustomBySlot.set(slot, key);
      }
    }

    for (const [index, item] of set.items.entries()) {
      if (item.enabled === false) continue;
      const key = item.categoryKey.trim();
      if (!key || applied.has(key) || isCustomFlowCategoryKey(key)) continue;
      for (const slot of resolveFixedFlowItemMealSlots(item, index)) {
        if (activeSlots && !activeSlots.has(slot)) continue;
        if (appliedCustomBySlot.has(slot)) superseded.add(key);
      }
    }
  }

  return superseded;
}

function pruneSectionsMealSlotsForOrder(
  slots: Record<string, DayMealSlot[]>,
  order: readonly string[],
): Record<string, DayMealSlot[]> {
  const allowed = new Set(order);
  const next: Record<string, DayMealSlot[]> = {};
  for (const [key, values] of Object.entries(slots)) {
    if (!allowed.has(key) || values.length === 0) continue;
    next[key] = [...values];
  }
  return next;
}

/** 시간대별 보기 — 적용 중인 고정 루틴 구간을 반영 */
export function syncPrioritySectionsMealSlotsWithApplied(
  current: Record<string, DayMealSlot[]>,
  order: readonly string[],
  appliedOverrides: Record<string, DayMealSlot[]>,
  allFixedFlowKeys: Set<string>,
  appliedKeys: Set<string>,
): Record<string, DayMealSlot[]> {
  const next: Record<string, DayMealSlot[]> = {};

  for (const key of order) {
    if (appliedKeys.has(key) && appliedOverrides[key]?.length) {
      next[key] = [...appliedOverrides[key]!];
      continue;
    }
    const existing = current[key];
    if (existing && existing.length > 0) {
      next[key] = [...existing];
      continue;
    }
    if (!allFixedFlowKeys.has(key)) {
      continue;
    }
  }

  return pruneSectionsMealSlotsForOrder(next, order);
}

function sectionsMealSlotsEqual(
  a: Record<string, DayMealSlot[]>,
  b: Record<string, DayMealSlot[]>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => {
    const left = a[key];
    const right = b[key];
    if (!left || !right || left.length !== right.length) return false;
    return left.every((slot, index) => slot === right[index]);
  });
}

function createSpineBlockId(): string {
  const cryptoAny = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const u = cryptoAny.crypto?.randomUUID?.();
  if (u) return u;
  return `dpb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function collectActiveAppliedFixedFlowItems(input: {
  fixedFlowSets: readonly FixedFlowSet[];
  activeSetIds: readonly string[];
  activeMealSlotsBySetId?: Record<string, DayMealSlot[]>;
  appliedKeys: ReadonlySet<string>;
}): FixedFlowSetItem[] {
  const out: FixedFlowSetItem[] = [];
  const seen = new Set<string>();

  for (const set of input.fixedFlowSets) {
    if (!input.activeSetIds.includes(set.id)) continue;
    const activeSlotsRaw = input.activeMealSlotsBySetId?.[set.id];
    const activeSlots =
      isBuiltinPresetScheduleSet(set) && Array.isArray(activeSlotsRaw) && activeSlotsRaw.length > 0
        ? new Set(activeSlotsRaw)
        : null;

    for (const [index, item] of set.items.entries()) {
      if (item.enabled === false) continue;
      const key = item.categoryKey.trim();
      if (!key || !input.appliedKeys.has(key) || seen.has(key)) continue;
      if (activeSlots) {
        const slots = resolveFixedFlowItemMealSlots(item, index);
        if (!slots.some((slot) => activeSlots.has(slot))) continue;
      }
      seen.add(key);
      out.push(item);
    }
  }

  return out;
}

function spineBlocksEqual(a: readonly DayPlanBlock[], b: readonly DayPlanBlock[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((block, index) => {
    const other = b[index];
    if (!other) return false;
    return (
      block.id === other.id &&
      block.categoryKey === other.categoryKey &&
      block.title === other.title &&
      block.category === other.category &&
      block.startMinutes === other.startMinutes &&
      block.endMinutes === other.endMinutes &&
      block.blockOrigin === other.blockOrigin
    );
  });
}

/** 타임라인 보기 — 적용 중인 고정 루틴을 spineTimeline 블록으로 반영 */
export function syncSpinePlanBlocksWithAppliedFixedRoutines(input: {
  planBlocks: readonly DayPlanBlock[];
  appliedKeys: readonly string[];
  allFixedFlowKeys: Set<string>;
  routineCatalogSelectionKeys: ReadonlySet<string>;
  supersededStandardKeys: ReadonlySet<string>;
  fixedFlowSets: readonly FixedFlowSet[];
  activeSetIds: readonly string[];
  activeMealSlotsBySetId?: Record<string, DayMealSlot[]>;
  priorityStart: string;
  priorityEnd: string;
}): DayPlanBlock[] | null {
  const appliedSet = new Set(input.appliedKeys);
  const nonSpineBlocks = input.planBlocks.filter((block) => !isDayPlanSpineTimelineBlock(block));
  const activeItems = collectActiveAppliedFixedFlowItems({
    fixedFlowSets: input.fixedFlowSets,
    activeSetIds: input.activeSetIds,
    activeMealSlotsBySetId: input.activeMealSlotsBySetId,
    appliedKeys: appliedSet,
  });
  const scheduleByKey = resolveFixedFlowSpineSchedules({
    items: activeItems,
    priorityStart: input.priorityStart,
    priorityEnd: input.priorityEnd,
  });

  const keptSpineBlocks = filterSpineTimelineBlocks([...input.planBlocks]).filter((block) => {
    const key = block.categoryKey?.trim();
    if (!key) return true;
    if (input.supersededStandardKeys.has(key)) return false;
    if (!input.allFixedFlowKeys.has(key)) return true;
    if (appliedSet.has(key)) return true;
    return input.routineCatalogSelectionKeys.has(key);
  });

  const spineByKey = new Map<string, DayPlanBlock>();
  for (const block of keptSpineBlocks) {
    const key = block.categoryKey?.trim();
    if (key) spineByKey.set(key, block);
  }

  let maxOrder = input.planBlocks.reduce((acc, block) => Math.max(acc, block.order), -1);

  for (const key of input.appliedKeys) {
    if (input.supersededStandardKeys.has(key)) continue;
    const schedule = scheduleByKey.get(key);
    if (!schedule) continue;

    const label = resolveCategoryKeyDisplayLabelKo(key);
    const existing = spineByKey.get(key);
    if (existing) {
      const nextTitle = looksLikeRawCategoryKeyTitle(existing.title, key)
        ? label
        : existing.title;
      const nextCategory = looksLikeRawCategoryKeyTitle(existing.category ?? '', key)
        ? label
        : existing.category ?? label;
      const scheduleChanged =
        existing.startMinutes !== schedule.startMinutes ||
        existing.endMinutes !== schedule.endMinutes ||
        Boolean(existing.endsNextCalendarDay) !== Boolean(schedule.endsNextCalendarDay);
      const labelChanged = nextTitle !== existing.title || nextCategory !== existing.category;
      if (scheduleChanged || labelChanged) {
        spineByKey.set(key, {
          ...existing,
          title: nextTitle,
          category: nextCategory,
          startMinutes: schedule.startMinutes,
          endMinutes: schedule.endMinutes,
          ...(schedule.endsNextCalendarDay
            ? { endsNextCalendarDay: true as const }
            : { endsNextCalendarDay: undefined }),
        });
      }
      continue;
    }

    maxOrder += 1;
    spineByKey.set(key, {
      id: createSpineBlockId(),
      title: label,
      category: label,
      categoryKey: key,
      startMinutes: schedule.startMinutes,
      endMinutes: schedule.endMinutes,
      order: maxOrder,
      blockOrigin: 'spineTimeline',
      ...(schedule.endsNextCalendarDay ? { endsNextCalendarDay: true as const } : {}),
    });
  }

  // 같은 categoryKey로 여러 스파인 블록이 있으면 spineByKey 해석 결과가
  // 동일 id로 반복될 수 있어, key·id 기준으로 한 번만 남긴다.
  const orderedSpineBlocks: DayPlanBlock[] = [];
  const seenSpineIds = new Set<string>();
  const seenSpineKeys = new Set<string>();
  for (const block of keptSpineBlocks) {
    const key = block.categoryKey?.trim();
    if (key && !spineByKey.has(key)) continue;
    const resolved = key ? spineByKey.get(key)! : block;
    if (seenSpineIds.has(resolved.id)) continue;
    if (key) {
      if (seenSpineKeys.has(key)) continue;
      seenSpineKeys.add(key);
    }
    seenSpineIds.add(resolved.id);
    orderedSpineBlocks.push(resolved);
  }

  for (const [key, block] of spineByKey.entries()) {
    if (seenSpineKeys.has(key)) continue;
    if (seenSpineIds.has(block.id)) continue;
    seenSpineKeys.add(key);
    seenSpineIds.add(block.id);
    orderedSpineBlocks.push(block);
  }

  const nextBlocks = sortDayPlanBlocks([...nonSpineBlocks, ...orderedSpineBlocks]);
  const currentBlocks = sortDayPlanBlocks([...input.planBlocks]);
  if (spineBlocksEqual(nextBlocks, currentBlocks)) return null;
  return nextBlocks;
}

export type SyncTodayTabWithFixedRoutineInput = {
  priorityCategoryOrder: string[];
  priorityMealSlotOverrides: Record<string, DayMealSlot>;
  prioritySectionsCategoryOrder: string[];
  prioritySectionsMealSlots: Record<string, DayMealSlot[]>;
  priorityStart: string;
  priorityEnd: string;
  planBlocks: readonly DayPlanBlock[];
  todayAppliedCategoryKeys: string[];
  activeSetIds: string[];
  activeMealSlotsBySetId?: Record<string, DayMealSlot[]>;
  scheduledMealSlotLayoutEnabled: boolean;
  fixedRoutineApplyLayoutMode: FixedRoutineApplyLayoutMode;
  fixedFlowSets: FixedFlowSet[];
  /** 루틴 탭에서 직접 선택한 categoryKey */
  routineCatalogSelectionKeys?: string[];
};

export type SyncTodayTabWithFixedRoutinePatch = {
  priorityCategoryOrder?: string[];
  priorityMealSlotOverrides?: Record<string, DayMealSlot>;
  prioritySectionsCategoryOrder?: string[];
  prioritySectionsMealSlots?: Record<string, DayMealSlot[]>;
  planBlocks?: DayPlanBlock[];
};

/** 오늘의 루틴「오늘 적용」상태에 맞게 오늘 탭 담기·구간·타임라인 패치 계산 */
export function computeSyncTodayTabWithFixedRoutineApply(
  input: SyncTodayTabWithFixedRoutineInput,
): SyncTodayTabWithFixedRoutinePatch | null {
  const appliedKeys = filterKeysToPriorityCatalog(input.todayAppliedCategoryKeys);
  const allFixedFlowKeys = collectAllFixedFlowCategoryKeys(input.fixedFlowSets);
  const appliedSet = new Set(appliedKeys);
  const catalogSelection = new Set(
    filterKeysToPriorityCatalog(input.routineCatalogSelectionKeys ?? []),
  );

  const supersededStandardKeys = collectStandardsSupersededByAppliedCustom(
    input.fixedFlowSets,
    input.activeSetIds,
    input.activeMealSlotsBySetId,
    appliedKeys,
  );

  const layoutMode = input.fixedRoutineApplyLayoutMode;

  if (layoutMode === 'spine') {
    const nextBlocks = syncSpinePlanBlocksWithAppliedFixedRoutines({
      planBlocks: input.planBlocks,
      appliedKeys,
      allFixedFlowKeys,
      routineCatalogSelectionKeys: catalogSelection,
      supersededStandardKeys,
      fixedFlowSets: input.fixedFlowSets,
      activeSetIds: input.activeSetIds,
      activeMealSlotsBySetId: input.activeMealSlotsBySetId,
      priorityStart: input.priorityStart,
      priorityEnd: input.priorityEnd,
    });
    return nextBlocks ? { planBlocks: nextBlocks } : null;
  }

  const patch: SyncTodayTabWithFixedRoutinePatch = {};

  if (layoutMode === 'bag') {
    const orderWithoutSuperseded = sanitizePriorityCategoryOrderKeys(
      input.priorityCategoryOrder.filter((key) => !supersededStandardKeys.has(key)),
    );
    const nextOrder = mergeOrderWithAppliedFixedRoutines(
      orderWithoutSuperseded,
      appliedKeys,
      allFixedFlowKeys,
      catalogSelection,
    );
    const prunedOverrides = pruneMealSlotOverrides(
      input.priorityMealSlotOverrides,
      appliedSet,
      allFixedFlowKeys,
      catalogSelection,
    );

    const orderChanged =
      nextOrder.length !== input.priorityCategoryOrder.length ||
      nextOrder.some((key, index) => key !== input.priorityCategoryOrder[index]);
    const overridesChanged =
      Object.keys(prunedOverrides).length !== Object.keys(input.priorityMealSlotOverrides).length ||
      Object.keys(prunedOverrides).some(
        (key) => prunedOverrides[key] !== input.priorityMealSlotOverrides[key],
      );

    if (orderChanged) patch.priorityCategoryOrder = nextOrder;
    if (overridesChanged) patch.priorityMealSlotOverrides = prunedOverrides;
    return Object.keys(patch).length > 0 ? patch : null;
  }

  const sectionsWithoutSuperseded = sanitizePriorityCategoryOrderKeys(
    input.prioritySectionsCategoryOrder.filter((key) => !supersededStandardKeys.has(key)),
  );
  const nextSectionsOrder = mergeOrderWithAppliedFixedRoutines(
    sectionsWithoutSuperseded,
    appliedKeys,
    allFixedFlowKeys,
    catalogSelection,
  );
  const appliedOverrides = buildAppliedFixedRoutineMealSlotsMap(
    {
      sets: input.fixedFlowSets,
      activeSetIds: input.activeSetIds,
      activeMealSlotsBySetId: input.activeMealSlotsBySetId,
    },
    appliedKeys,
  );
  const nextSectionsSlots = syncPrioritySectionsMealSlotsWithApplied(
    input.prioritySectionsMealSlots,
    nextSectionsOrder,
    appliedOverrides,
    allFixedFlowKeys,
    appliedSet,
  );

  const sectionsOrderChanged =
    nextSectionsOrder.length !== input.prioritySectionsCategoryOrder.length ||
    nextSectionsOrder.some((key, index) => key !== input.prioritySectionsCategoryOrder[index]);
  const sectionsSlotsChanged = !sectionsMealSlotsEqual(
    nextSectionsSlots,
    input.prioritySectionsMealSlots,
  );

  if (sectionsOrderChanged) patch.prioritySectionsCategoryOrder = nextSectionsOrder;
  if (sectionsSlotsChanged) patch.prioritySectionsMealSlots = nextSectionsSlots;
  return Object.keys(patch).length > 0 ? patch : null;
}
