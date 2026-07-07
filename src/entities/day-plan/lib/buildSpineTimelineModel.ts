import type { DayPlanBlock } from '../model/types';

import { filterSpineTimelineBlocks } from './dayPlanFlowBlock';
import { effectiveEndMinutesExclusive } from './dayPlanTime';
import { formatSpineGapCoaching } from './formatSpineGapCoaching';
import {
  isSpineBlockWithinPriorityWindow,
  resolveSpinePriorityWindow,
} from './spinePriorityWindow';
import type { SpineTimelineRow } from './spineTimelineTypes';

export type BuildSpineTimelineModelInput = {
  priorityStart: string;
  priorityEnd: string;
  blocks: DayPlanBlock[];
  nowMinutes: number;
  dayStartLabel?: string;
  dayEndLabel?: string;
};

type TimedItem =
  | { kind: 'anchor'; role: 'dayStart' | 'dayEnd'; minutes: number; label: string }
  | { kind: 'block'; block: DayPlanBlock; startMinutes: number; endMinutes: number };

function filterSpineBlocks(blocks: DayPlanBlock[]): DayPlanBlock[] {
  return filterSpineTimelineBlocks(blocks).sort(
    (a, b) => a.startMinutes - b.startMinutes || a.order - b.order,
  );
}

function itemStartMinutes(item: TimedItem): number {
  return item.kind === 'block' ? item.startMinutes : item.minutes;
}

function itemEndMinutes(item: TimedItem): number {
  if (item.kind === 'block') {
    return Math.min(effectiveEndMinutesExclusive(item.block), 24 * 60);
  }
  return item.minutes;
}

function pushGap(
  rows: SpineTimelineRow[],
  fromMinutes: number,
  toMinutes: number,
  nowMinutes: number,
  hasUpcomingBlock: boolean,
): void {
  const from = Math.max(0, fromMinutes);
  const to = Math.min(24 * 60, toMinutes);
  if (to - from < 5) return;

  const nowMinutesInGap =
    nowMinutes > from && nowMinutes < to ? nowMinutes : undefined;

  const durationBase =
    nowMinutesInGap != null ? to - nowMinutesInGap : to - from;
  const durationMin = Math.max(5, durationBase);

  rows.push({
    kind: 'gap',
    fromMinutes: from,
    toMinutes: to,
    durationMin,
    coachingLine: formatSpineGapCoaching(durationMin, hasUpcomingBlock),
    ...(nowMinutesInGap != null ? { nowMinutes: nowMinutesInGap } : {}),
  });
}

function toRow(item: TimedItem): SpineTimelineRow {
  if (item.kind === 'anchor') {
    return {
      kind: 'anchor',
      role: item.role,
      minutes: item.minutes,
      label: item.label,
    };
  }
  return {
    kind: 'block',
    block: item.block,
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
  };
}

/** 하루 시작·블록·마무리·갭을 시간 순으로 펼친 스파인 타임라인 모델 */
export function buildSpineTimelineModel(input: BuildSpineTimelineModelInput): SpineTimelineRow[] {
  const window = resolveSpinePriorityWindow(input.priorityStart, input.priorityEnd);
  if (!window) return [];

  const startMin = window.startMin;
  const endMin = window.endMin;

  const spineBlocksInWindow = filterSpineBlocks(input.blocks).filter((block) =>
    isSpineBlockWithinPriorityWindow(block, window),
  );

  const sequence: TimedItem[] = [
    {
      kind: 'anchor',
      role: 'dayStart',
      minutes: startMin,
      label: input.dayStartLabel ?? '하루 시작',
    },
    ...spineBlocksInWindow.map((block) => ({
      kind: 'block' as const,
      block,
      startMinutes: block.startMinutes,
      endMinutes: Math.min(effectiveEndMinutesExclusive(block), 24 * 60),
    })),
    {
      kind: 'anchor',
      role: 'dayEnd',
      minutes: endMin,
      label: input.dayEndLabel ?? '하루 마무리',
    },
  ];

  sequence.sort((a, b) => itemStartMinutes(a) - itemStartMinutes(b));

  const rows: SpineTimelineRow[] = [];
  for (let i = 0; i < sequence.length; i += 1) {
    const item = sequence[i]!;
    if (i > 0) {
      const prev = sequence[i - 1]!;
      const hasUpcomingBlock = item.kind === 'block' || item.role === 'dayEnd';
      pushGap(
        rows,
        itemEndMinutes(prev),
        itemStartMinutes(item),
        input.nowMinutes,
        hasUpcomingBlock,
      );
    }
    rows.push(toRow(item));
  }

  return rows;
}
