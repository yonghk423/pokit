import type { DayPlanBlock } from '@entities/day-plan/model/types';

/**
 * 시간 기반·우선순위로 저장된 일정 플로우 블록.
 * 빠른 메모는 같은 저장소에 있어도 「플로우」가 아니므로 제외한다.
 */
export function isDayPlanFlowBlock(block: DayPlanBlock): boolean {
  return block.blockOrigin !== 'quickMemo';
}

export function filterDayPlanFlowBlocks(blocks: DayPlanBlock[]): DayPlanBlock[] {
  return blocks.filter(isDayPlanFlowBlock);
}
