import type { DayPlanBlock } from '../model/types';

import { filterSpineTimelineBlocks } from './dayPlanFlowBlock';

/** 갭 안에서 다음으로 넣을 수 있는 시작·종료 분. 불가면 null */
export function computeSpineGapInsertSlot(
  fromMinutes: number,
  toMinutes: number,
  blocks: DayPlanBlock[],
  nowMinutes: number,
  defaultDurationMin = 15,
  minDurationMin = 1,
): { startMinutes: number; endMinutes: number } | null {
  const gapFrom = Math.max(0, fromMinutes);
  const gapTo = Math.min(24 * 60, toMinutes);
  const gapWidth = gapTo - gapFrom;
  if (gapWidth < minDurationMin) return null;

  const blocksInGap = filterSpineTimelineBlocks(blocks)
    .filter((b) => b.startMinutes < gapTo && b.endMinutes > gapFrom)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.order - b.order);

  let cursor = Math.max(gapFrom, nowMinutes);

  for (const b of blocksInGap) {
    if (cursor + minDurationMin <= b.startMinutes) {
      const end = Math.min(cursor + defaultDurationMin, b.startMinutes, gapTo);
      if (end - cursor >= minDurationMin) {
        return { startMinutes: cursor, endMinutes: end };
      }
    }
    cursor = Math.max(cursor, b.endMinutes);
  }

  if (gapTo - cursor >= minDurationMin) {
    return {
      startMinutes: cursor,
      endMinutes: Math.min(cursor + defaultDurationMin, gapTo),
    };
  }

  // 지금 시각 이후 여유가 없어도, 사용자가 선택한 갭 구간 안에서 초안을 연다.
  const span = Math.min(defaultDurationMin, gapWidth);
  return {
    startMinutes: gapFrom,
    endMinutes: gapFrom + span,
  };
}
