import {
  buildAppliedFixedRoutineMealSlotOverrides,
  resolveFixedFlowItemMealSlot,
  type DayMealSlot,
  type FixedFlowSet,
} from '@shared/lib/storage';

import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { getLocalDateKey } from './localDateKey';
import { filterKeysToPriorityCatalog } from './priorityCatalogRegistry';

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

/** 고정 루틴에 해당하는 키가 `order`에 없으면, 고정 순서대로 **앞쪽에만** 붙인다. */
function ensureFixedRoutinesInPriorityOrder(order: string[], fixedOrder: string[]): string[] {
  const missing = fixedOrder.filter((k) => !order.includes(k));
  if (missing.length === 0) return order;
  return [...missing, ...order];
}

/**
 * 오늘 탭 담기 순서를 고정 루틴 적용 상태와 맞춘다.
 * - 오늘 적용 중이 아닌 루틴 세트 항목은 제거
 * - 오늘 적용 중인 항목은 앞쪽에 보강
 */
export function syncPriorityOrderWithAppliedFixedRoutines(
  order: string[],
  appliedKeys: string[],
  allFixedFlowKeys: Set<string>,
): string[] {
  const applied = new Set(appliedKeys);
  const withoutInactiveRoutine = order.filter(
    (key) => !allFixedFlowKeys.has(key) || applied.has(key),
  );
  return ensureFixedRoutinesInPriorityOrder(withoutInactiveRoutine, appliedKeys);
}

function pruneMealSlotOverrides(
  overrides: Record<string, DayMealSlot>,
  appliedKeys: Set<string>,
  allFixedFlowKeys: Set<string>,
): Record<string, DayMealSlot> {
  const next = { ...overrides };
  for (const key of allFixedFlowKeys) {
    if (!appliedKeys.has(key)) delete next[key];
  }
  return next;
}

function mergeAppliedFixedRoutineMealSlotOverrides(
  draftOverrides: Record<string, DayMealSlot>,
  prunedOverrides: Record<string, DayMealSlot>,
  appliedOverrides: Record<string, DayMealSlot>,
): Record<string, DayMealSlot> {
  const next = { ...prunedOverrides };
  for (const [key, slot] of Object.entries(appliedOverrides)) {
    if (!(key in draftOverrides)) next[key] = slot;
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
      const slot = resolveFixedFlowItemMealSlot(item, index);
      if (activeSlots && !activeSlots.has(slot)) continue;
      if (!appliedCustomBySlot.has(slot)) appliedCustomBySlot.set(slot, key);
    }

    for (const [index, item] of set.items.entries()) {
      if (item.enabled === false) continue;
      const key = item.categoryKey.trim();
      if (!key || applied.has(key) || isCustomFlowCategoryKey(key)) continue;
      const slot = resolveFixedFlowItemMealSlot(item, index);
      if (activeSlots && !activeSlots.has(slot)) continue;
      if (appliedCustomBySlot.has(slot)) superseded.add(key);
    }
  }

  return superseded;
}

export type SyncTodayTabWithFixedRoutineInput = {
  priorityCategoryOrder: string[];
  priorityMealSlotOverrides: Record<string, DayMealSlot>;
  priorityBagDismissedDateKey: string;
  priorityBagDismissedKeys: string[];
  todayAppliedCategoryKeys: string[];
  activeSetIds: string[];
  activeMealSlotsBySetId?: Record<string, DayMealSlot[]>;
  scheduledMealSlotLayoutEnabled: boolean;
  fixedFlowSets: FixedFlowSet[];
};

export type SyncTodayTabWithFixedRoutinePatch = {
  priorityCategoryOrder?: string[];
  priorityMealSlotOverrides?: Record<string, DayMealSlot>;
};

/** 오늘의 루틴「오늘 적용」상태에 맞게 오늘 탭 담기·구간 패치 계산 */
export function computeSyncTodayTabWithFixedRoutineApply(
  input: SyncTodayTabWithFixedRoutineInput,
): SyncTodayTabWithFixedRoutinePatch | null {
  const today = getLocalDateKey();
  const todayDismissed =
    input.priorityBagDismissedDateKey === today
      ? new Set(input.priorityBagDismissedKeys)
      : new Set<string>();

  const appliedKeys = filterKeysToPriorityCatalog(input.todayAppliedCategoryKeys).filter(
    (key) => !todayDismissed.has(key),
  );
  const allFixedFlowKeys = collectAllFixedFlowCategoryKeys(input.fixedFlowSets);
  const appliedSet = new Set(appliedKeys);

  const supersededStandardKeys = collectStandardsSupersededByAppliedCustom(
    input.fixedFlowSets,
    input.activeSetIds,
    input.activeMealSlotsBySetId,
    appliedKeys,
  );
  const orderWithoutSuperseded = input.priorityCategoryOrder.filter(
    (key) => !supersededStandardKeys.has(key),
  );

  const nextOrder = syncPriorityOrderWithAppliedFixedRoutines(
    orderWithoutSuperseded,
    appliedKeys,
    allFixedFlowKeys,
  );

  const appliedOverrides = buildAppliedFixedRoutineMealSlotOverrides(
    {
      sets: input.fixedFlowSets,
      activeSetIds: input.activeSetIds,
      activeMealSlotsBySetId: input.activeMealSlotsBySetId,
    },
    appliedKeys,
  );
  const prunedOverrides = pruneMealSlotOverrides(
    input.priorityMealSlotOverrides,
    appliedSet,
    allFixedFlowKeys,
  );
  const nextOverrides = mergeAppliedFixedRoutineMealSlotOverrides(
    input.priorityMealSlotOverrides,
    prunedOverrides,
    appliedOverrides,
  );

  const orderChanged =
    nextOrder.length !== input.priorityCategoryOrder.length ||
    nextOrder.some((key, index) => key !== input.priorityCategoryOrder[index]);
  const overridesChanged =
    Object.keys(nextOverrides).length !== Object.keys(input.priorityMealSlotOverrides).length ||
    Object.keys(nextOverrides).some(
      (key) => nextOverrides[key] !== input.priorityMealSlotOverrides[key],
    );

  if (!orderChanged && !overridesChanged) return null;

  return {
    ...(orderChanged ? { priorityCategoryOrder: nextOrder } : {}),
    ...(overridesChanged ? { priorityMealSlotOverrides: nextOverrides } : {}),
  };
}
