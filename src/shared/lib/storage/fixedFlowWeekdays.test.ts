import {
  formatApplyWeekdaysHint,
  formatApplyWeekdaysLabel,
  isApplyWeekdayMatchedToday,
  normalizeApplyWeekdays,
  resolveApplyWeekdays,
} from './fixedFlowWeekdays';

describe('fixedFlowWeekdays', () => {
  it('formats custom weekday labels', () => {
    expect(formatApplyWeekdaysLabel([1, 2])).toBe('월·화');
    expect(formatApplyWeekdaysLabel([4])).toBe('목');
    expect(formatApplyWeekdaysLabel([1, 2, 3, 4, 5])).toBe('평일');
  });

  it('builds hint from selected weekdays', () => {
    expect(formatApplyWeekdaysHint([3, 5])).toBe('수, 금 오늘 탭에 자동으로 추가돼요.');
  });

  it('matches only selected weekdays', () => {
    expect(isApplyWeekdayMatchedToday([1, 2], new Date('2026-07-06T09:00:00+09:00'))).toBe(true);
    expect(isApplyWeekdayMatchedToday([1, 2], new Date('2026-07-07T09:00:00+09:00'))).toBe(true);
    expect(isApplyWeekdayMatchedToday([1, 2], new Date('2026-07-08T09:00:00+09:00'))).toBe(false);
  });

  it('resolves weekdays from applyRule when custom list is missing', () => {
    expect(resolveApplyWeekdays({ applyRule: 'weekend', applyWeekdays: [] })).toEqual([0, 6]);
    expect(normalizeApplyWeekdays([2, 1, 2])).toEqual([1, 2]);
  });
});
