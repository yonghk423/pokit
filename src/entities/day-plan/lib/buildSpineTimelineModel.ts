import type { DayPlanBlock } from '../model/types';

import { filterSpineTimelineBlocks } from './dayPlanFlowBlock';
import { effectiveEndMinutesExclusive } from './dayPlanTime';
import { formatSpineGapCoaching } from './formatSpineGapCoaching';
import {
  isSpineBlockScheduleWithinPriorityWindow,
  resolveSpinePriorityWindow,
  type SpinePriorityWindow,
} from './spinePriorityWindow';
import type { SpineTimelineRow } from './spineTimelineTypes';

export type BuildSpineTimelineModelInput = {
  priorityStart: string;
  priorityEnd: string;
  blocks: DayPlanBlock[];
  nowMinutes: number;
  dayStartLabel?: string;
  dayEndLabel?: string;
  dayStartDateCaption?: string;
  dayEndDateCaption?: string;
};

type TimedItem =
  | {
      kind: 'anchor';
      role: 'dayStart' | 'dayEnd';
      minutes: number;
      label: string;
      dateCaption?: string;
    }
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

/** overnight 구간에서 하루 흐름 순서용 키 (저녁 → 자정 넘김 → 아침 → 마무리) */
function overnightSequenceKey(
  minutes: number,
  window: SpinePriorityWindow,
  role?: 'dayStart' | 'dayEnd',
): number {
  if (role === 'dayStart') return window.startMin;
  if (role === 'dayEnd') return 24 * 60 + window.endMin;
  if (minutes >= window.startMin) return minutes;
  return 24 * 60 + minutes;
}

function pushGap(
  rows: SpineTimelineRow[],
  fromMinutes: number,
  toMinutes: number,
  nowMinutes: number,
  hasUpcomingBlock: boolean,
): void {
  const from = Math.max(0, Math.floor(fromMinutes));
  const to = Math.min(24 * 60, Math.floor(toMinutes));
  if (to - from < 5) return;

  const nowMinutesInGap =
    nowMinutes >= from && nowMinutes < to ? nowMinutes : undefined;

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

/** overnight: 자정을 넘는 갭을 저녁 잔여 + 아침 앞부분으로 나눈다. */
function pushOvernightGap(
  rows: SpineTimelineRow[],
  fromMinutes: number,
  toMinutes: number,
  window: SpinePriorityWindow,
  nowMinutes: number,
  hasUpcomingBlock: boolean,
): void {
  const from = Math.max(0, Math.floor(fromMinutes));
  const to = Math.max(0, Math.min(24 * 60, Math.floor(toMinutes)));

  if (from < 24 * 60 && from >= window.startMin) {
    pushGap(rows, from, 24 * 60, nowMinutes, hasUpcomingBlock);
  }
  if (to > 0 && to <= window.endMin) {
    pushGap(rows, 0, to, nowMinutes, hasUpcomingBlock);
  }
}

function toRow(item: TimedItem): SpineTimelineRow {
  if (item.kind === 'anchor') {
    return {
      kind: 'anchor',
      role: item.role,
      minutes: item.minutes,
      label: item.label,
      ...(item.dateCaption ? { dateCaption: item.dateCaption } : {}),
    };
  }
  return {
    kind: 'block',
    block: item.block,
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
  };
}

function appendSequenceRows(
  rows: SpineTimelineRow[],
  sequence: TimedItem[],
  nowMinutes: number,
  overnightWindow: SpinePriorityWindow | null,
): void {
  for (let i = 0; i < sequence.length; i += 1) {
    const item = sequence[i]!;
    if (i > 0) {
      const prev = sequence[i - 1]!;
      const hasUpcomingBlock = item.kind === 'block' || item.role === 'dayEnd';
      const from = itemEndMinutes(prev);
      const to = itemStartMinutes(item);
      if (overnightWindow && to < from) {
        pushOvernightGap(rows, from, to, overnightWindow, nowMinutes, hasUpcomingBlock);
      } else {
        pushGap(rows, from, to, nowMinutes, hasUpcomingBlock);
      }
    }
    rows.push(toRow(item));
  }
}

/** 하루 시작·블록·마무리·갭을 시간 순으로 펼친 스파인 타임라인 모델 */
export function buildSpineTimelineModel(input: BuildSpineTimelineModelInput): SpineTimelineRow[] {
  const window = resolveSpinePriorityWindow(input.priorityStart, input.priorityEnd);
  if (!window) return [];

  const startMin = window.startMin;
  const endMin = window.endMin;

  const seenBlockIds = new Set<string>();
  const spineBlocksInWindow = filterSpineBlocks(input.blocks).filter((block) => {
    if (seenBlockIds.has(block.id)) return false;
    if (
      !isSpineBlockScheduleWithinPriorityWindow(
        {
          startMinutes: block.startMinutes,
          endMinutes: block.endMinutes,
          endsNextCalendarDay: block.endsNextCalendarDay,
        },
        window,
      )
    ) {
      return false;
    }
    seenBlockIds.add(block.id);
    return true;
  });

  const dayStart: TimedItem = {
    kind: 'anchor',
    role: 'dayStart',
    minutes: startMin,
    label: input.dayStartLabel ?? '하루 시작',
    ...(input.dayStartDateCaption ? { dateCaption: input.dayStartDateCaption } : {}),
  };
  const dayEnd: TimedItem = {
    kind: 'anchor',
    role: 'dayEnd',
    minutes: endMin,
    label: input.dayEndLabel ?? '하루 마무리',
    ...(input.dayEndDateCaption ? { dateCaption: input.dayEndDateCaption } : {}),
  };
  const blockItems: TimedItem[] = spineBlocksInWindow.map((block) => ({
    kind: 'block' as const,
    block,
    startMinutes: block.startMinutes,
    endMinutes: Math.min(effectiveEndMinutesExclusive(block), 24 * 60),
  }));

  if (!window.overnight) {
    const sequence: TimedItem[] = [dayStart, ...blockItems, dayEnd];
    sequence.sort((a, b) => itemStartMinutes(a) - itemStartMinutes(b));
    const rows: SpineTimelineRow[] = [];
    appendSequenceRows(rows, sequence, input.nowMinutes, null);
    return rows;
  }

  // overnight: 시작 → 저녁 밴드 블록 → 아침 밴드 블록 → 마무리
  const eveningBlocks = blockItems
    .filter((item) => item.kind === 'block' && item.startMinutes >= startMin)
    .sort((a, b) => {
      if (a.kind !== 'block' || b.kind !== 'block') return 0;
      return a.startMinutes - b.startMinutes;
    });
  const morningBlocks = blockItems
    .filter((item) => item.kind === 'block' && item.startMinutes < startMin)
    .sort((a, b) => {
      if (a.kind !== 'block' || b.kind !== 'block') return 0;
      return a.startMinutes - b.startMinutes;
    });

  const sequence: TimedItem[] = [dayStart, ...eveningBlocks, ...morningBlocks, dayEnd];
  // 동일 시각 충돌 시 앵커/블록 안정 정렬
  sequence.sort((a, b) => {
    const ka = overnightSequenceKey(
      itemStartMinutes(a),
      window,
      a.kind === 'anchor' ? a.role : undefined,
    );
    const kb = overnightSequenceKey(
      itemStartMinutes(b),
      window,
      b.kind === 'anchor' ? b.role : undefined,
    );
    return ka - kb;
  });

  const rows: SpineTimelineRow[] = [];
  appendSequenceRows(rows, sequence, input.nowMinutes, window);
  return rows;
}
