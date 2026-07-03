import type { DayPlanBlock } from '../model/types';

import { reorderSpineTimelineBlocks } from './reorderSpineTimelineBlocks';

function spineBlock(partial: Partial<DayPlanBlock> & Pick<DayPlanBlock, 'id'>): DayPlanBlock {
  return {
    title: partial.title ?? partial.id,
    category: '사용자',
    startMinutes: 60,
    endMinutes: 75,
    order: 0,
    blockOrigin: 'spineTimeline',
    ...partial,
  };
}

describe('reorderSpineTimelineBlocks', () => {
  it('swaps block content while keeping time slots', () => {
    const blocks = [
      spineBlock({ id: 'a', title: '독서', startMinutes: 60, endMinutes: 75, order: 0 }),
      spineBlock({ id: 'b', title: '운동', startMinutes: 90, endMinutes: 105, order: 1 }),
      spineBlock({
        id: 'bag',
        title: '가방',
        startMinutes: 120,
        endMinutes: 135,
        order: 2,
        blockOrigin: undefined,
      }),
    ];

    const next = reorderSpineTimelineBlocks(blocks, 0, 1);
    const spine = next.filter((b) => b.blockOrigin === 'spineTimeline');

    expect(spine.find((b) => b.id === 'a')).toMatchObject({
      title: '독서',
      startMinutes: 90,
      endMinutes: 105,
    });
    expect(spine.find((b) => b.id === 'b')).toMatchObject({
      title: '운동',
      startMinutes: 60,
      endMinutes: 75,
    });
    expect(next.find((b) => b.id === 'bag')).toMatchObject({
      startMinutes: 120,
      endMinutes: 135,
    });
  });
});
