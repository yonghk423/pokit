import type { DayPlanBlock } from '@entities/day-plan/model/types';

import {
  blockEndWallTimeMs,
  isBlockEndInPastForDateKey,
  minuteOffsetToDateMs,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  toRuntimeTiming,
} from './dayPlanRuntimeTime';

function block(partial: Partial<DayPlanBlock>): DayPlanBlock {
  return {
    id: 'b1',
    title: '독서',
    category: '독서',
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
    order: 0,
    ...partial,
  };
}

describe('minuteOffsetToDateMs', () => {
  it('returns epoch for date key and minutes', () => {
    const ms = minuteOffsetToDateMs('2025-05-24', 9 * 60);
    expect(ms).not.toBeNull();
    const d = new Date(ms!);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it('returns null for invalid date key', () => {
    expect(minuteOffsetToDateMs('invalid', 0)).toBeNull();
  });
});

describe('resolveCategoryKeyFromLabel', () => {
  it('maps known Korean labels', () => {
    expect(resolveCategoryKeyFromLabel('독서')).toBe('reading');
    expect(resolveCategoryKeyFromLabel('  수분 ')).toBe('water');
    expect(resolveCategoryKeyFromLabel('알 수 없음')).toBeNull();
  });
});

describe('resolveBlockCategoryKey', () => {
  it('prefers categoryKey over category label', () => {
    expect(resolveBlockCategoryKey({ category: '독서', categoryKey: 'work' })).toBe('work');
    expect(resolveBlockCategoryKey({ category: '독서' })).toBe('reading');
  });
});

describe('blockEndWallTimeMs and toRuntimeTiming', () => {
  it('computes same-day end', () => {
    const end = blockEndWallTimeMs('2025-05-24', { endMinutes: 10 * 60 });
    const start = minuteOffsetToDateMs('2025-05-24', 9 * 60);
    expect(end).toBeGreaterThan(start!);
  });

  it('computes overnight end on next calendar day', () => {
    const b = block({ endMinutes: 1 * 60, endsNextCalendarDay: true });
    const timing = toRuntimeTiming('2025-05-24', b);
    expect(timing).not.toBeNull();
    expect(timing!.endAtMs).toBeGreaterThan(timing!.startAtMs);
    expect(timing!.categoryKey).toBe('reading');
  });

  it('detects past block end', () => {
    const past = isBlockEndInPastForDateKey(
      '2020-01-01',
      { endMinutes: 8 * 60 },
      new Date('2025-01-01').getTime(),
    );
    expect(past).toBe(true);
  });
});
