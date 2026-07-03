import type { DayPlanBlock } from '@entities/day-plan/model/types';

import {
  filterBagTimelineFlowBlocks,
  filterDayPlanFlowBlocks,
  isDayPlanFlowBlock,
  migrateSpineTimelineBlockOrigins,
} from './dayPlanFlowBlock';

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

  it('separates bag timeline and spine timeline blocks', () => {
    const blocks = [
      block({ id: 'bag' }),
      block({ id: 'spine', blockOrigin: 'spineTimeline' }),
    ];
    expect(filterBagTimelineFlowBlocks(blocks).map((b) => b.id)).toEqual(['bag']);
  });

  it('migrates legacy spine gap blocks without origin', () => {
    const blocks = [
      block({ id: 'legacy', title: '새 일정', category: '사용자' }),
      block({ id: 'keep', title: '독서', category: 'reading' }),
    ];
    const migrated = migrateSpineTimelineBlockOrigins(blocks);
    expect(migrated[0]?.blockOrigin).toBe('spineTimeline');
    expect(migrated[1]?.blockOrigin).toBeUndefined();
  });
});
