import type { DayPlanBlock } from '@entities/day-plan/model/types';

/**
 * 시간 기반·우선순위로 저장된 일정 플로우 블록.
 * 빠른 메모는 같은 저장소에 있어도 「플로우」가 아니므로 제외한다.
 */
export function isDayPlanFlowBlock(block: DayPlanBlock): boolean {
  return block.blockOrigin !== 'quickMemo';
}

/** 스파인 타임라인 모드 전용 블록 */
export function isDayPlanSpineTimelineBlock(block: DayPlanBlock): boolean {
  return block.blockOrigin === 'spineTimeline';
}

/** 전체·구간 보기 타임라인 — 스파인 전용 블록 제외 */
export function filterBagTimelineFlowBlocks(blocks: DayPlanBlock[]): DayPlanBlock[] {
  return filterDayPlanFlowBlocks(blocks).filter((b) => !isDayPlanSpineTimelineBlock(b));
}

export function filterSpineTimelineBlocks(blocks: DayPlanBlock[]): DayPlanBlock[] {
  return blocks.filter(isDayPlanSpineTimelineBlock);
}

/** 스파인 갭에서 추가된 레거시 블록(출처 미표기)을 스파인 전용으로 분류 */
export function migrateSpineTimelineBlockOrigins(blocks: DayPlanBlock[]): DayPlanBlock[] {
  let changed = false;
  const next = blocks.map((b) => {
    if (b.blockOrigin) return b;
    if (b.title === '새 일정' && b.category === '사용자') {
      changed = true;
      return { ...b, blockOrigin: 'spineTimeline' as const };
    }
    return b;
  });
  return changed ? next : blocks;
}

export function filterDayPlanFlowBlocks(blocks: DayPlanBlock[]): DayPlanBlock[] {
  return blocks.filter(isDayPlanFlowBlock);
}
