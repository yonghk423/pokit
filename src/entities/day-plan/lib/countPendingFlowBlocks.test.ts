import { countPendingFlowBlocks } from './countPendingFlowBlocks';

import type { DayPlanBlock } from '../model/types';

function block(id: string, origin?: DayPlanBlock['blockOrigin']): DayPlanBlock {
  return {
    id,
    title: 't',
    category: 'c',
    startMinutes: 60,
    endMinutes: 120,
    order: 0,
    ...(origin ? { blockOrigin: origin } : {}),
  };
}

describe('countPendingFlowBlocks', () => {
  it('counts flow blocks that are not completed or skipped', () => {
    expect(
      countPendingFlowBlocks({
        blocks: [block('a'), block('b'), block('memo', 'quickMemo')],
        completedBlockIds: ['a'],
        skippedBlockIds: [],
      }),
    ).toBe(1);
  });

  it('treats skipped blocks as done', () => {
    expect(
      countPendingFlowBlocks({
        blocks: [block('a'), block('b')],
        completedBlockIds: [],
        skippedBlockIds: ['b'],
      }),
    ).toBe(1);
  });
});
