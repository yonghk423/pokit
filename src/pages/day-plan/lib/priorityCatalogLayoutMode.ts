import {
  buildSpineImportFromBag,
  collectSpineTimelineCategoryKeys,
  getLocalDateKey,
  type DayPlanBlock,
} from '@entities/day-plan';
import { filterSpineTimelineBlocks } from '@entities/day-plan/lib/dayPlanFlowBlock';
import { normalizeDayMealSlot, resolveCurrentMealSlotFromSchedule, type DayMealSlot } from '@shared/lib/storage';

import { getPickerCategoryLabel } from './dayPlanEditorShared';
import type { DayPlanLayoutMode } from '../ui/DayPlanLayoutModeTabs';

const DEFAULT_CATALOG_MEAL_SLOT: DayMealSlot = 'morning';

export function resolveCatalogTargetMealSlot(input: {
  schedule: import('@shared/lib/storage').DayMealSlotSchedule;
  nowMinutes: number;
  fallback?: DayMealSlot;
}): DayMealSlot {
  return resolveCurrentMealSlotFromSchedule(input.nowMinutes, input.schedule) ?? input.fallback ?? DEFAULT_CATALOG_MEAL_SLOT;
}

export function resolveCatalogLayoutMode(input: {
  priorityMealSlotLayoutEnabled: boolean;
  prioritySpineLayoutEnabled: boolean;
}): DayPlanLayoutMode {
  if (input.prioritySpineLayoutEnabled) return 'spine';
  if (input.priorityMealSlotLayoutEnabled) return 'sections';
  return 'bag';
}

export function catalogLayoutModeLead(mode: DayPlanLayoutMode): string {
  if (mode === 'sections') {
    return '담을 시간대를 고른 뒤 루틴을 탭하면 해당 구간에 추가돼요.';
  }
  if (mode === 'spine') {
    return '타임라인 보기에 담을 루틴을 골라요. 탭한 항목은 오늘 탭 타임라인에 시간과 함께 쌓여요.';
  }
  return '목록 보기에 담을 루틴을 골라요. 탭한 항목은 오늘 탭 우선 순위에 순서대로 쌓여요.';
}

export function catalogLayoutModeActiveLabel(mode: DayPlanLayoutMode): string {
  if (mode === 'sections') return '시간대';
  if (mode === 'spine') return '타임라인';
  return '목록';
}

export function resolveCatalogSelectedKeys(input: {
  layoutMode: DayPlanLayoutMode;
  priorityCategoryOrder: readonly string[];
  prioritySectionsCategoryOrder: readonly string[];
  planBlocks: readonly DayPlanBlock[];
}): string[] {
  if (input.layoutMode === 'bag') {
    return [...input.priorityCategoryOrder];
  }
  if (input.layoutMode === 'sections') {
    return [...input.prioritySectionsCategoryOrder];
  }
  return collectSpineTimelineCategoryKeys(input.planBlocks);
}

export function isCatalogKeySelected(
  key: string,
  selectedKeys: readonly string[],
): boolean {
  return selectedKeys.includes(key);
}

function findSpineBlockIdForCategory(
  blocks: readonly DayPlanBlock[],
  categoryKey: string,
): string | null {
  const key = categoryKey.trim();
  for (const block of filterSpineTimelineBlocks([...blocks])) {
    if (block.categoryKey?.trim() === key) return block.id;
  }
  return null;
}

export type CatalogToggleResult =
  | { ok: true; selected: boolean }
  | { ok: false; reason: 'priority_window_ended' | 'spine_window_full' };

export type CatalogToggleContext = {
  layoutMode: DayPlanLayoutMode;
  key: string;
  selected: boolean;
  priorityStart: string;
  priorityEnd: string;
  planBlocks: readonly DayPlanBlock[];
  nowMinutes: number;
  /** sections 모드에서 담을 때 사용할 시간대 */
  targetMealSlot?: DayMealSlot;
};

export type CatalogToggleActions = {
  setPriorityCategoryOrder: (order: string[]) => void;
  saveRoutineCatalogSelectionKeys: (keys: string[]) => void;
  appendPrioritySectionsCategoryKeys: (keys: string[]) => void;
  appendPrioritySectionsWithMealSlot: (keys: string[], mealSlot: DayMealSlot) => void;
  setPrioritySectionsCategoryOrder: (order: string[]) => void;
  addPrioritySectionMealSlot: (categoryKey: string, slot: DayMealSlot) => void;
  addPlanBlock: (input: {
    title: string;
    category: string;
    categoryKey: string;
    startMinutes: number;
    endMinutes: number;
    blockOrigin: 'spineTimeline';
    planDateKey?: string;
  }) => { ok: boolean };
  removePlanBlock: (blockId: string) => void;
  getPriorityCategoryOrder: () => string[];
  getPrioritySectionsCategoryOrder: () => string[];
};

export function toggleCatalogItemForLayoutMode(
  ctx: CatalogToggleContext,
  actions: CatalogToggleActions,
): CatalogToggleResult {
  const key = ctx.key.trim();
  if (!key) return { ok: true, selected: false };

  if (ctx.layoutMode === 'bag') {
    const order = actions.getPriorityCategoryOrder();
    const next = ctx.selected ? order.filter((k) => k !== key) : [...order, key];
    actions.setPriorityCategoryOrder(next);
    actions.saveRoutineCatalogSelectionKeys(next);
    return { ok: true, selected: !ctx.selected };
  }

  if (ctx.layoutMode === 'sections') {
    const order = actions.getPrioritySectionsCategoryOrder();
    if (ctx.selected) {
      actions.setPrioritySectionsCategoryOrder(order.filter((k) => k !== key));
      return { ok: true, selected: false };
    }
    const slot = normalizeDayMealSlot(ctx.targetMealSlot) ?? DEFAULT_CATALOG_MEAL_SLOT;
    actions.appendPrioritySectionsWithMealSlot([key], slot);
    return { ok: true, selected: true };
  }

  const blockId = findSpineBlockIdForCategory(ctx.planBlocks, key);
  if (ctx.selected && blockId) {
    actions.removePlanBlock(blockId);
    return { ok: true, selected: false };
  }
  if (ctx.selected) {
    return { ok: true, selected: false };
  }
  const label = getPickerCategoryLabel(key);
  const suggested = buildSpineImportFromBag({
    categoryKeys: [key],
    resolveTitle: () => label,
    priorityStart: ctx.priorityStart,
    priorityEnd: ctx.priorityEnd,
    existingBlocks: ctx.planBlocks,
    nowMinutes: ctx.nowMinutes,
  });
  if (suggested.length === 0) {
    return { ok: false, reason: 'spine_window_full' };
  }
  const row = suggested[0]!;
  const result = actions.addPlanBlock({
    title: row.title,
    category: label,
    categoryKey: key,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
    blockOrigin: 'spineTimeline',
    planDateKey: getLocalDateKey(),
  });
  if (!result.ok) {
    return { ok: false, reason: 'spine_window_full' };
  }
  return { ok: true, selected: true };
}
