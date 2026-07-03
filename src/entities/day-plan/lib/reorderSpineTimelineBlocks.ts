import type { DayPlanBlock } from '../model/types';

import { filterSpineTimelineBlocks } from './dayPlanFlowBlock';
import { sortDayPlanBlocks } from './dayPlanTime';

function spineBlocksInTimelineOrder(blocks: DayPlanBlock[]): DayPlanBlock[] {
  return filterSpineTimelineBlocks(blocks).sort(
    (a, b) => a.startMinutes - b.startMinutes || a.order - b.order,
  );
}

/** 스파인 블록 순서 변경 — 시간 슬롯은 유지하고 블록 내용만 재배치 */
export function reorderSpineTimelineBlocks(
  allBlocks: DayPlanBlock[],
  fromIndex: number,
  toIndex: number,
): DayPlanBlock[] {
  const spineBlocks = spineBlocksInTimelineOrder(allBlocks);
  const len = spineBlocks.length;
  if (len < 2 || fromIndex < 0 || toIndex < 0 || fromIndex >= len || toIndex >= len) {
    return allBlocks;
  }
  if (fromIndex === toIndex) return allBlocks;

  const slots = spineBlocks.map((b) => ({
    startMinutes: b.startMinutes,
    endMinutes: b.endMinutes,
  }));

  const reordered = [...spineBlocks];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  const patched = reordered.map((block, index) => ({
    ...block,
    startMinutes: slots[index]!.startMinutes,
    endMinutes: slots[index]!.endMinutes,
    order: index,
  }));

  const patchById = new Map(patched.map((b) => [b.id, b]));
  return sortDayPlanBlocks(allBlocks.map((b) => patchById.get(b.id) ?? b));
}
