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
  it('uses categoryKey catalog icon when present', () => {
    expect(getBlockTimelineIcon(block({ categoryKey: 'reading', category: '독서' }))).toBe(
      'book.fill',
    );
    expect(getBlockTimelineIcon(block({ categoryKey: 'medicine', category: '약 복용' }))).toBe(
      'cross.case.fill',
    );
  });

  it('falls back to title and legacy category heuristics', () => {
    const unknownCategory = { category: '커스텀 일정' as const };
    expect(getBlockTimelineIcon(block({ title: '취침 준비', ...unknownCategory }))).toBe(
      'moon.stars.fill',
    );
    expect(getBlockTimelineIcon(block({ title: '기상 알람', ...unknownCategory }))).toBe(
      'sun.max.fill',
    );
    expect(getBlockTimelineIcon(block({ category: '건강' }))).toBe('heart.fill');
    expect(getBlockTimelineIcon(block({ category: '딥워크' }))).toBe('bolt.fill');
    expect(getBlockTimelineIcon(block({ category: '생산성' }))).toBe('bag.fill');
  });

  it('uses bookmark when category label cannot be resolved', () => {
    expect(getBlockTimelineIcon(block({ category: '커스텀 일정' }))).toBe('bookmark.fill');
  });
});
