import type { DayPlanBlock } from '../model/types';

import { computeSpineGapInsertSlot } from './computeSpineGapInsertSlot';

function spineBlock(partial: Partial<DayPlanBlock> & Pick<DayPlanBlock, 'id'>): DayPlanBlock {
  return {
    title: '일정',
    category: '사용자',
    startMinutes: 60,
    endMinutes: 75,
    order: 0,
    blockOrigin: 'spineTimeline',
    ...partial,
  };
}

describe('computeSpineGapInsertSlot', () => {
  it('returns first free slot after now within gap', () => {
    const slot = computeSpineGapInsertSlot(60, 120, [], 70);
    expect(slot).toEqual({ startMinutes: 70, endMinutes: 85 });
  });

  it('skips overlapping spine blocks in gap', () => {
    const blocks = [
      spineBlock({ id: 'a', startMinutes: 80, endMinutes: 95 }),
    ];
    const slot = computeSpineGapInsertSlot(60, 120, blocks, 70);
    expect(slot).toEqual({ startMinutes: 70, endMinutes: 80 });
  });

  it('places slot after block when only a short gap remains before it', () => {
    const blocks = [
      spineBlock({ id: 'a', startMinutes: 72, endMinutes: 95 }),
    ];
    const slot = computeSpineGapInsertSlot(60, 120, blocks, 70);
    expect(slot).toEqual({ startMinutes: 70, endMinutes: 72 });
  });

  it('places slot after block when no room remains before it', () => {
    const blocks = [
      spineBlock({ id: 'a', startMinutes: 70, endMinutes: 95 }),
    ];
    const slot = computeSpineGapInsertSlot(60, 120, blocks, 70);
    expect(slot).toEqual({ startMinutes: 95, endMinutes: 110 });
  });

  it('uses remaining short gap when less than default duration', () => {
    const slot = computeSpineGapInsertSlot(60, 67, [], 64);
    expect(slot).toEqual({ startMinutes: 64, endMinutes: 67 });
  });

  it('opens draft inside past short gap instead of rejecting', () => {
    const slot = computeSpineGapInsertSlot(60, 67, [], 70);
    expect(slot).toEqual({ startMinutes: 60, endMinutes: 67 });
  });

  it('returns null when gap is too small', () => {
    const blocks = [
      spineBlock({ id: 'a', startMinutes: 60, endMinutes: 118 }),
    ];
    expect(computeSpineGapInsertSlot(60, 60, blocks, 60)).toBeNull();
  });
});
