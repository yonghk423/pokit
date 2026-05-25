import type { DayPlanBlock } from '@entities/day-plan/model/types';

import { blockMatchesPriorityHhmmWindow } from './priorityWindowBlockMatch';

function block(partial: Partial<DayPlanBlock>): DayPlanBlock {
  return {
    id: '1',
    title: 't',
    category: 'reading',
    startMinutes: 9 * 60,
    endMinutes: 12 * 60,
    order: 0,
    ...partial,
  };
}

describe('blockMatchesPriorityHhmmWindow', () => {
  const ps = 9 * 60;
  const pe = 12 * 60;

  it('matches same-day window', () => {
    expect(blockMatchesPriorityHhmmWindow(block({}), ps, pe, false)).toBe(true);
  });

  it('matches when block has endsNextCalendarDay but window is same-day', () => {
    expect(
      blockMatchesPriorityHhmmWindow(block({ endsNextCalendarDay: true }), ps, pe, false),
    ).toBe(true);
  });

  it('rejects different times', () => {
    expect(blockMatchesPriorityHhmmWindow(block({ startMinutes: 10 * 60 }), ps, pe, false)).toBe(
      false,
    );
  });
});
