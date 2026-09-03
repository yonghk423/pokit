import { DayPlanBlock } from '@entities/day-plan/model/types';

import {
  blockDurationSec,
  dayPlanTimeRangesOverlap,
  effectiveEndMinutesExclusive,
  findOverlappingDayPlanBlock,
  findOverlappingDayPlanBlocks,
  formatHhmmClockKo,
  formatMinuteOfDayKo,
  getFirstPendingBlock,
  getNextPendingAfter,
  sortDayPlanBlocks,
  totalPlannedMinutes,
  formatSpineScheduleRangeLabel,
} from './dayPlanTime';

function block(partial: Partial<DayPlanBlock> & Pick<DayPlanBlock, 'id'>): DayPlanBlock {
  return {
    title: '테스트',
    category: 'reading',
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
    order: 0,
    ...partial,
  };
}

describe('dayPlanTimeRangesOverlap', () => {
  it('treats touching boundaries as non-overlap', () => {
    expect(dayPlanTimeRangesOverlap(9 * 60, 10 * 60, 10 * 60, 11 * 60)).toBe(false);
  });

  it('detects partial overlap', () => {
    expect(dayPlanTimeRangesOverlap(9 * 60, 10 * 60 + 30, 10 * 60, 11 * 60)).toBe(true);
  });
});

describe('findOverlappingDayPlanBlock', () => {
  const blocks = [
    block({ id: 'a', startMinutes: 9 * 60, endMinutes: 10 * 60, order: 0 }),
    block({ id: 'b', startMinutes: 11 * 60, endMinutes: 12 * 60, order: 1 }),
  ];

  it('finds overlapping block', () => {
    const hit = findOverlappingDayPlanBlock(blocks, 9 * 60 + 30, 10 * 60 + 30);
    expect(hit?.id).toBe('a');
  });

  it('excludes block by id', () => {
    const hit = findOverlappingDayPlanBlock(blocks, 9 * 60, 10 * 60, 'a');
    expect(hit).toBeNull();
  });
});

describe('block duration and formatting', () => {
  it('computes duration for same-day and overnight blocks', () => {
    expect(
      blockDurationSec(block({ id: 'd1', startMinutes: 9 * 60, endMinutes: 10 * 60 })),
    ).toBe(60 * 60);
    expect(
      blockDurationSec(
        block({
          id: 'd2',
          startMinutes: 22 * 60,
          endMinutes: 2 * 60,
          endsNextCalendarDay: true,
        }),
      ),
    ).toBe((24 * 60 - 22 * 60 + 2 * 60) * 60);
    expect(effectiveEndMinutesExclusive(block({ id: 'd3', endMinutes: 10 * 60 }))).toBe(10 * 60);
    expect(
      effectiveEndMinutesExclusive(
        block({ id: 'd4', endMinutes: 2 * 60, endsNextCalendarDay: true }),
      ),
    ).toBe(24 * 60 + 2 * 60);
  });

  it('formats Korean clock strings', () => {
    expect(formatMinuteOfDayKo(0)).toBe('AM 00:00');
    expect(formatMinuteOfDayKo(9 * 60)).toBe('AM 9:00');
    expect(formatMinuteOfDayKo(24 * 60)).toBe('AM 00:00');
    expect(formatHhmmClockKo('24:00')).toBe('AM 00:00');
    expect(formatHhmmClockKo('14:30')).toContain('PM');
  });

  it('formats spine schedule ranges with next-day caption', () => {
    expect(
      formatSpineScheduleRangeLabel({
        startMinutes: 19 * 60,
        endMinutes: 22 * 60,
      }),
    ).toBe('PM 7:00 – PM 10:00');
    expect(
      formatSpineScheduleRangeLabel({
        startMinutes: 19 * 60,
        endMinutes: 10 * 60,
        endsNextCalendarDay: true,
        endDayCaption: '다음날',
      }),
    ).toBe('PM 7:00 – 다음날 AM 10:00');
    expect(
      formatSpineScheduleRangeLabel({
        startMinutes: 19 * 60,
        endMinutes: 10 * 60,
        endsNextCalendarDay: true,
        endDayCaption: '9.4',
      }),
    ).toBe('PM 7:00 – 9.4 AM 10:00');
  });

  it('sums planned minutes and sorts by order', () => {
    const blocks = [
      block({ id: 'b', order: 2, startMinutes: 0, endMinutes: 30 }),
      block({ id: 'a', order: 1, startMinutes: 0, endMinutes: 60 }),
    ];
    expect(totalPlannedMinutes(blocks)).toBe(90);
    expect(sortDayPlanBlocks(blocks).map((b) => b.id)).toEqual(['a', 'b']);
  });
});

describe('findOverlappingDayPlanBlocks', () => {
  it('returns all overlapping blocks', () => {
    const blocks = [
      block({ id: 'a', startMinutes: 9 * 60, endMinutes: 10 * 60, order: 0 }),
      block({ id: 'b', startMinutes: 9 * 60 + 15, endMinutes: 10 * 60 + 15, order: 1 }),
      block({ id: 'c', startMinutes: 14 * 60, endMinutes: 15 * 60, order: 2 }),
    ];
    const hits = findOverlappingDayPlanBlocks(blocks, 9 * 60 + 30, 10 * 60 + 30);
    expect(hits.map((b) => b.id).sort()).toEqual(['a', 'b']);
  });
});

describe('pending block selection', () => {
  const blocks = [
    block({ id: 'a', order: 0 }),
    block({ id: 'b', order: 1 }),
    block({ id: 'c', order: 2 }),
  ];

  it('returns first pending by order', () => {
    expect(getFirstPendingBlock(blocks, ['a'], [])?.id).toBe('b');
  });

  it('returns next pending after current', () => {
    expect(getNextPendingAfter(blocks, 'a', [], [])?.id).toBe('b');
    expect(getNextPendingAfter(blocks, 'b', ['a'], [])?.id).toBe('c');
    expect(getNextPendingAfter(blocks, 'c', [], [])).toBeNull();
  });
});
