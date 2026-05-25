import type { DayPlanBlock } from '@entities/day-plan/model/types';

import { getBlockTimelineIcon } from './blockIcons';

function block(partial: Partial<DayPlanBlock>): DayPlanBlock {
  return {
    id: '1',
    title: 't',
    category: '기타',
    startMinutes: 0,
    endMinutes: 60,
    order: 0,
    ...partial,
  };
}

describe('getBlockTimelineIcon', () => {
  it('maps title and category to symbols', () => {
    expect(getBlockTimelineIcon(block({ title: '취침 준비' }))).toBe('moon.stars.fill');
    expect(getBlockTimelineIcon(block({ title: '기상 알람' }))).toBe('sun.max.fill');
    expect(getBlockTimelineIcon(block({ category: '건강' }))).toBe('heart.fill');
    expect(getBlockTimelineIcon(block({ category: '딥워크' }))).toBe('bolt.fill');
    expect(getBlockTimelineIcon(block({ category: '생산성' }))).toBe('bag.fill');
    expect(getBlockTimelineIcon(block({}))).toBe('clock.fill');
  });
});
