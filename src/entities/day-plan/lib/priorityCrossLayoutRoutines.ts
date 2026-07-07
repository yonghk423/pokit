import { filterSpineTimelineBlocks } from './dayPlanFlowBlock';
import type { PriorityLayoutLinkMode } from './priorityLayoutLinkMode';
import type { DayPlanBlock } from '../model/types';

export type PriorityLayoutRoutineSourceMode = 'bag' | 'sections' | 'spine';

export type PriorityLayoutRoutineSource = {
  mode: PriorityLayoutRoutineSourceMode;
  keys: readonly string[];
};

export function collectSpineTimelineCategoryKeys(blocks: readonly DayPlanBlock[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const block of filterSpineTimelineBlocks([...blocks])) {
    const key = block.categoryKey?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

/** 다른 보기에 이미 담긴 루틴의 최초 출처(목록 → 시간대별 → 타임라인 우선) */
export function resolvePriorityLayoutRoutineSource(input: {
  priorityCategoryOrder: readonly string[];
  prioritySectionsCategoryOrder: readonly string[];
  prioritySectionsLinkMode: PriorityLayoutLinkMode | null;
  planBlocks: readonly DayPlanBlock[];
}): PriorityLayoutRoutineSource | null {
  if (input.priorityCategoryOrder.length > 0) {
    return { mode: 'bag', keys: input.priorityCategoryOrder };
  }

  if (
    input.prioritySectionsLinkMode === 'independent' &&
    input.prioritySectionsCategoryOrder.length > 0
  ) {
    return { mode: 'sections', keys: input.prioritySectionsCategoryOrder };
  }

  const spineKeys = collectSpineTimelineCategoryKeys(input.planBlocks);
  if (spineKeys.length > 0) {
    return { mode: 'spine', keys: spineKeys };
  }

  return null;
}

export function priorityLayoutRoutineSourceLabelKo(mode: PriorityLayoutRoutineSourceMode): string {
  if (mode === 'bag') return '목록';
  if (mode === 'sections') return '시간대별';
  return '타임라인';
}

/** 연동 대상 보기에서 가져올 루틴 키(자기 보기 제외) */
export function resolveCrossLayoutRoutineKeysForTarget(input: {
  targetMode: Extract<PriorityLayoutRoutineSourceMode, 'sections' | 'spine'>;
  priorityCategoryOrder: readonly string[];
  prioritySectionsCategoryOrder: readonly string[];
  prioritySectionsLinkMode: PriorityLayoutLinkMode | null;
  planBlocks: readonly DayPlanBlock[];
}): readonly string[] {
  const source = resolvePriorityLayoutRoutineSource(input);
  if (!source || source.mode === input.targetMode) return [];
  return source.keys;
}
