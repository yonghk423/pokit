import {
  buildSpineImportFromBag,
  collectSpineTimelineCategoryKeys,
  getLocalDateKey,
  parseHHmmToMinutes,
  type DayPlanBlock,
} from '@entities/day-plan';
import { filterSpineTimelineBlocks } from '@entities/day-plan/lib/dayPlanFlowBlock';
import { normalizeDayMealSlot, resolveCurrentMealSlotFromSchedule, type DayMealSlot, appendRoutineCatalogSelectionKeys, removeRoutineCatalogSelectionKey } from '@shared/lib/storage';

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
    return '시간대 아이콘을 누르면 바로 구간을 고를 수 있어요.';
  }
  if (mode === 'spine') {
    return '시간 아이콘을 누르면 시작·종료 시각을 정할 수 있어요. 담은 항목은 오늘 탭 타임라인에 쌓여요.';
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

export type CatalogSpineSchedule = {
  startMinutes: number;
  endMinutes: number;
  blockId?: string;
  isInTimeline: boolean;
};

export function findSpineBlockIdForCategory(
  blocks: readonly DayPlanBlock[],
  categoryKey: string,
): string | null {
  const key = categoryKey.trim();
  for (const block of filterSpineTimelineBlocks([...blocks])) {
    if (block.categoryKey?.trim() === key) return block.id;
  }
  return null;
}

const DEFAULT_SPINE_BLOCK_MIN = 30;

/** 루틴 목록 타임라인 행 — 담긴 블록 시각 또는 집중 구간 안 제안 시각 */
export function resolveCatalogSpineScheduleForKey(input: {
  categoryKey: string;
  planBlocks: readonly DayPlanBlock[];
  priorityStart: string;
  priorityEnd: string;
  nowMinutes: number;
}): CatalogSpineSchedule {
  const key = input.categoryKey.trim();
  for (const block of filterSpineTimelineBlocks([...input.planBlocks])) {
    if (block.categoryKey?.trim() === key) {
      return {
        startMinutes: block.startMinutes,
        endMinutes: block.endMinutes,
        blockId: block.id,
        isInTimeline: true,
      };
    }
  }

  const suggested = buildSpineImportFromBag({
    categoryKeys: [key],
    resolveTitle: () => key,
    priorityStart: input.priorityStart,
    priorityEnd: input.priorityEnd,
    existingBlocks: input.planBlocks,
    nowMinutes: input.nowMinutes,
  });
  if (suggested[0]) {
    return {
      startMinutes: suggested[0].startMinutes,
      endMinutes: suggested[0].endMinutes,
      isInTimeline: false,
    };
  }

  const windowStart = parseHHmmToMinutes(input.priorityStart) ?? 9 * 60;
  const windowEndRaw = parseHHmmToMinutes(input.priorityEnd) ?? 22 * 60;
  const windowEnd = windowEndRaw <= windowStart ? 24 * 60 : windowEndRaw;
  const start = Math.min(Math.max(windowStart, input.nowMinutes), windowEnd - DEFAULT_SPINE_BLOCK_MIN);
  const end = Math.min(start + DEFAULT_SPINE_BLOCK_MIN, windowEnd);

  return {
    startMinutes: start,
    endMinutes: end,
    isInTimeline: false,
  };
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
      removeRoutineCatalogSelectionKey(key);
      return { ok: true, selected: false };
    }
    const slot = normalizeDayMealSlot(ctx.targetMealSlot) ?? DEFAULT_CATALOG_MEAL_SLOT;
    actions.appendPrioritySectionsWithMealSlot([key], slot);
    appendRoutineCatalogSelectionKeys([key]);
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
