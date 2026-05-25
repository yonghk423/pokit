import type { DayPlanBlock } from '@entities/day-plan/model/types';

import { filterDayPlanFlowBlocks, isDayPlanFlowBlock } from './dayPlanFlowBlock';

function block(partial: Partial<DayPlanBlock>): DayPlanBlock {
  return {
    id: '1',
    title: 't',
    category: 'reading',
    startMinutes: 0,
    endMinutes: 60,
    order: 0,
    ...partial,
  };
}

describe('dayPlanFlowBlock', () => {
  it('excludes quickMemo origin', () => {
    expect(isDayPlanFlowBlock(block({ blockOrigin: 'quickMemo' }))).toBe(false);
    expect(isDayPlanFlowBlock(block({}))).toBe(true);
    expect(isDayPlanFlowBlock(block({ blockOrigin: 'prioritySession' }))).toBe(true);
  });

  it('filters flow blocks only', () => {
    const blocks = [
      block({ id: 'a' }),
      block({ id: 'b', blockOrigin: 'quickMemo' }),
      block({ id: 'c' }),
    ];
    expect(filterDayPlanFlowBlocks(blocks).map((b) => b.id)).toEqual(['a', 'c']);
  });
});
