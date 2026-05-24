import { DayPlanBlock } from '@entities/day-plan/model/types';

import {
  dayPlanTimeRangesOverlap,
  findOverlappingDayPlanBlock,
  getFirstPendingBlock,
  getNextPendingAfter,
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
