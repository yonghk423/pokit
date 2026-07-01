import type { DayPlanBlock } from '../model/types';

import { filterDayPlanFlowBlocks } from './dayPlanFlowBlock';

/** 완료·건너뛰기가 아닌 플로우 블록 개수 */
export function countPendingFlowBlocks(input: {
  blocks: DayPlanBlock[];
  completedBlockIds: string[];
  skippedBlockIds: string[];
}): number {
  const done = new Set([...input.completedBlockIds, ...input.skippedBlockIds]);
  return filterDayPlanFlowBlocks(input.blocks).filter((b) => !done.has(b.id)).length;
}
