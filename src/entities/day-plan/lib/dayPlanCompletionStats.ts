import { filterDayPlanFlowBlocks } from './dayPlanFlowBlock';
import { resolveBlockCategoryKey } from './dayPlanRuntimeTime';
import type { DayPlanBlock } from '../model/types';

/** 완료 처리된 플로우 블록만 — 카테고리 키별 완료 횟수 */
export function buildCompletedCountByCategoryKey(
  blocks: DayPlanBlock[],
  completedBlockIds: string[],
): Record<string, number> {
  const flow = filterDayPlanFlowBlocks(blocks);
  const byId = new Map(flow.map((b) => [b.id, b]));
  const counts: Record<string, number> = {};
  for (const id of completedBlockIds) {
    const b = byId.get(id);
    if (!b) continue;
    const k = resolveBlockCategoryKey(b) ?? 'other';
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
